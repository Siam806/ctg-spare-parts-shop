import { MedusaService } from "@medusajs/framework/utils"
import { Logger } from "@medusajs/framework/types"
import { SendCloudClient } from "./clients/sendcloud"
import { PostNLClient } from "./clients/postnl"
import { CarrierRate, ShipmentRequest, LabelResult, TrackingInfo, CarrierType, type SendCloudConfig, type PostNLConfig } from "./types"
import ShipmentRecord from "./models/shipment-record"

interface ShippingModuleConfig {
  sendcloud?: SendCloudConfig
  postnl?: PostNLConfig
  defaultCarrier?: CarrierType
}

/**
 * ShippingModuleService
 *
 * Medusa module service for multi-carrier shipping integration.
 * Supports SendCloud (multi-carrier aggregator) and PostNL (direct).
 *
 * Features:
 * - Real-time rate fetching at checkout
 * - Automatic label generation
 * - Tracking number management
 * - Hazmat compliance
 * - Regional carrier selection
 */
class ShippingModuleService extends MedusaService({
  ShipmentRecord,
}) {
  private readonly sendcloudClient?: SendCloudClient
  private readonly postnlClient?: PostNLClient
  private readonly defaultCarrier: CarrierType
  private readonly logger: Logger

  constructor(
    container: { logger: Logger },
    config: ShippingModuleConfig = {}
  ) {
    super(container)
    this.logger = container.logger

    if (config.sendcloud) {
      this.sendcloudClient = new SendCloudClient(config.sendcloud)
    }

    if (config.postnl) {
      this.postnlClient = new PostNLClient(config.postnl)
    }

    this.defaultCarrier = config.defaultCarrier || "sendcloud"

    this.logger.info(
      `[ShippingModule] Initialized with carriers: ${this.getEnabledCarriers().join(", ")}`
    )
  }

  private getEnabledCarriers(): CarrierType[] {
    const carriers: CarrierType[] = []
    if (this.sendcloudClient) carriers.push("sendcloud")
    if (this.postnlClient) carriers.push("postnl")
    return carriers
  }

  /**
   * Get available shipping rates from all enabled carriers
   */
  async getRates(request: {
    from: { country: string; postalCode: string }
    to: { country: string; postalCode: string }
    weight: number // in grams
    dimensions?: { length: number; width: number; height: number } // in cm
    value?: number // parcel value for insurance
    isHazmat?: boolean
  }): Promise<CarrierRate[]> {
    const rates: CarrierRate[] = []
    const errors: string[] = []

    // Parallel rate fetching from all carriers
    const ratePromises: Promise<void>[] = []

    if (this.sendcloudClient) {
      ratePromises.push(
        (async () => {
          const sendcloudRates = await this.sendcloudClient!.getRates(request)
          rates.push(...sendcloudRates)
        })().catch((err) => {
          this.logger.warn(`[SendCloud] Rate fetch failed: ${err.message}`)
          errors.push(`SendCloud: ${err.message}`)
        })
      )
    }

    if (this.postnlClient && this.isPostNLEligible(request.to.country)) {
      ratePromises.push(
        (async () => {
          const postnlRates = await this.postnlClient!.getRates(request)
          rates.push(...postnlRates)
        })().catch((err) => {
          this.logger.warn(`[PostNL] Rate fetch failed: ${err.message}`)
          errors.push(`PostNL: ${err.message}`)
        })
      )
    }

    await Promise.all(ratePromises)

    // Sort by price
    rates.sort((a, b) => a.price - b.price)

    if (rates.length === 0 && errors.length > 0) {
      throw new Error(`All carriers failed: ${errors.join("; ")}`)
    }

    return rates
  }

  /**
   * Create shipping label with selected carrier
   */
  async createLabel(request: ShipmentRequest): Promise<LabelResult> {
    const carrier = request.carrier || this.defaultCarrier

    this.logger.info(
      `[ShippingModule] Creating label via ${carrier} for order ${request.orderId}`
    )

    let result: LabelResult

    switch (carrier) {
      case "sendcloud":
        if (!this.sendcloudClient) {
          throw new Error("SendCloud not configured")
        }
        result = await this.sendcloudClient.createLabel(request)
        break

      case "postnl":
        if (!this.postnlClient) {
          throw new Error("PostNL not configured")
        }
        result = await this.postnlClient.createLabel(request)
        break

      default:
        throw new Error(`Unknown carrier: ${carrier}`)
    }

    // Store shipment record
    await this.createShipmentRecords({
      order_id: request.orderId,
      carrier,
      service: result.service,
      tracking_number: result.trackingNumber,
      label_url: result.labelUrl,
      tracking_url: result.trackingUrl,
      cost: result.cost,
      weight: request.weight,
      from_address: request.from,
      to_address: request.to,
      hazmat: request.isHazmat || false,
      status: "created",
    })

    return result
  }

  /**
   * Get tracking information for a shipment
   */
  async getTracking(trackingNumber: string, carrier?: CarrierType): Promise<TrackingInfo> {
    const shipment = await this.listShipmentRecords({
      tracking_number: trackingNumber,
    })[0]

    const carrierToUse = carrier || shipment?.carrier || this.defaultCarrier

    switch (carrierToUse) {
      case "sendcloud":
        if (!this.sendcloudClient) {
          throw new Error("SendCloud not configured")
        }
        return this.sendcloudClient.getTracking(trackingNumber)

      case "postnl":
        if (!this.postnlClient) {
          throw new Error("PostNL not configured")
        }
        return this.postnlClient.getTracking(trackingNumber)

      default:
        throw new Error(`Unknown carrier: ${carrierToUse}`)
    }
  }

  /**
   * Validate address with carrier
   */
  async validateAddress(address: {
    country: string
    postalCode: string
    city: string
    street: string
    houseNumber?: string
  }): Promise<{ valid: boolean; suggestions?: string[] }> {
    // Use primary carrier for validation
    const fullAddress = {
      ...address,
      name: "Validation", // placeholder for required field
    }

    if (this.sendcloudClient) {
      return this.sendcloudClient.validateAddress(fullAddress)
    }

    if (this.postnlClient) {
      return this.postnlClient.validateAddress(fullAddress)
    }

    return { valid: true } // Fallback if no validation available
  }

  /**
   * Check if PostNL is eligible for destination (NL/BE)
   */
  private isPostNLEligible(countryCode: string): boolean {
    return ["NL", "BE"].includes(countryCode.toUpperCase())
  }

  /**
   * Get carrier recommendations based on destination
   * DE-based, shipping EU-wide
   */
  getRecommendedCarriers(countryCode: string): CarrierType[] {
    const carriers = this.getEnabledCarriers()
    const dest = countryCode.toUpperCase()

    // Germany domestic - DHL (via SendCloud) is preferred
    if (dest === "DE") {
      return carriers.sort((a) => (a === "sendcloud" ? -1 : 1))
    }

    // Neighboring countries - both work well
    if (["NL", "BE", "AT", "CH", "FR", "PL", "CZ"].includes(dest)) {
      return carriers
    }

    // Rest of EU - SendCloud has better coverage
    return carriers.sort((a) => (a === "sendcloud" ? -1 : 1))
  }
}

export default ShippingModuleService
