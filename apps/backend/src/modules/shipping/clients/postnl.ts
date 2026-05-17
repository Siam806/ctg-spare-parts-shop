import { Logger } from "@medusajs/framework/types"
import {
  CarrierRate,
  ShipmentRequest,
  LabelResult,
  TrackingInfo,
  TrackingEvent,
  Address,
  type PostNLConfig,
} from "../types"

/**
 * PostNL Client
 *
 * Direct integration with PostNL API for Dutch/Belgium shipping.
 * Primary carrier for domestic Netherlands deliveries.
 *
 * API Docs: https://developer.postnl.nl/
 */
export class PostNLClient {
  private readonly baseUrl = "https://api.postnl.nl"
  private readonly sandboxUrl = "https://api-sandbox.postnl.nl"
  private readonly config: PostNLConfig
  private readonly logger: Logger

  constructor(config: PostNLConfig, logger?: Logger) {
    this.config = config
    this.logger = logger || console as unknown as Logger
  }

  private getApiUrl(): string {
    return this.config.sandbox ? this.sandboxUrl : this.baseUrl
  }

  private getAuthHeaders(): Record<string, string> {
    return {
      apikey: this.config.apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    }
  }

  /**
   * Get available shipping rates from PostNL
   * Note: PostNL uses product codes rather than dynamic pricing
   */
  async getRates(request: {
    from: { country: string; postalCode: string }
    to: { country: string; postalCode: string }
    weight: number
    dimensions?: { length: number; width: number; height: number }
    value?: number
    isHazmat?: boolean
  }): Promise<CarrierRate[]> {
    // PostNL primarily serves NL and BE
    const destCountry = request.to.country.toUpperCase()
    if (!["NL", "BE"].includes(destCountry)) {
      return [] // PostNL not available for this destination
    }

    const rates: CarrierRate[] = []

    // Standard delivery (Standaard)
    if (this.canUseService(request, "standard")) {
      rates.push({
        id: "postnl_standard",
        carrier: "postnl",
        service: "standard",
        serviceName: destCountry === "NL" ? "PostNL Standaard" : "PostNL Belgium Standard",
        price: destCountry === "NL" ? 695 : 850, // €6.95 / €8.50 in cents
        currency: "eur",
        transitTimeMin: 1,
        transitTimeMax: destCountry === "NL" ? 2 : 3,
        isHazmatAllowed: false,
      })
    }

    // Evening delivery (Avondbezorging) - NL only
    if (destCountry === "NL" && this.canUseService(request, "evening")) {
      rates.push({
        id: "postnl_evening",
        carrier: "postnl",
        service: "evening",
        serviceName: "PostNL Avondbezorging",
        price: 1195, // €11.95 in cents
        currency: "eur",
        transitTimeMin: 1,
        transitTimeMax: 1,
        isHazmatAllowed: false,
      })
    }

    // Express - NL same day, BE next day
    if (this.canUseService(request, "express")) {
      rates.push({
        id: "postnl_express",
        carrier: "postnl",
        service: "express",
        serviceName: destCountry === "NL" ? "PostNL Same Day" : "PostNL Express",
        price: destCountry === "NL" ? 1995 : 2495,
        currency: "eur",
        transitTimeMin: 0,
        transitTimeMax: destCountry === "NL" ? 0 : 1,
        isHazmatAllowed: false,
      })
    }

    // Mailbox package (Brievenbuspakje) - small items only
    if (this.canUseMailbox(request)) {
      rates.push({
        id: "postnl_mailbox",
        carrier: "postnl",
        service: "mailbox",
        serviceName: "PostNL Brievenbuspakje",
        price: 425, // €4.25 in cents
        currency: "eur",
        transitTimeMin: 1,
        transitTimeMax: 2,
        isHazmatAllowed: false,
      })
    }

    return rates
  }

  private canUseService(
    request: { weight: number; isHazmat?: boolean; dimensions?: any },
    service: string
  ): boolean {
    if (request.isHazmat) return false

    // Standard weight limits
    const maxWeight = 31500 // 31.5kg for most services
    if (request.weight > maxWeight) return false

    return true
  }

  private canUseMailbox(request: { weight: number; dimensions?: any }): boolean {
    // Mailbox package: max 2kg, max 38x26.5x3.2 cm
    if (request.weight > 2000) return false

    if (request.dimensions) {
      const { length, width, height } = request.dimensions
      if (length > 38 || width > 26.5 || height > 3.2) return false
    }

    return true
  }

  /**
   * Create shipping label via PostNL
   */
  async createLabel(request: ShipmentRequest): Promise<LabelResult> {
    try {
      const service = request.service || "standard"
      const productCode = this.getProductCode(service, request.to.country)

      const payload = {
        Customer: {
          CustomerNumber: this.config.customerNumber,
          CustomerCode: this.config.customerCode,
        },
        Message: {
          MessageID: `1-${Date.now()}`,
          MessageTimeStamp: new Date().toISOString(),
          Printertype: "GraphicFile|PDF",
        },
        Shipments: {
          Shipment: {
            Addresses: {
              Address: [
                {
                  AddressType: "01", // Receiver
                  CompanyName: request.to.company || "",
                  Name: request.to.name,
                  Street: request.to.street,
                  HouseNr: request.to.houseNumber || "",
                  HouseNrExt: "",
                  Zipcode: request.to.postalCode,
                  City: request.to.city,
                  CountryCode: request.to.country.toUpperCase(),
                },
                {
                  AddressType: "02", // Sender
                  CompanyName: request.from?.company || "",
                  Name: request.from?.name || this.config.defaultSenderAddress?.name || "",
                  Street: request.from?.street || this.config.defaultSenderAddress?.street || "",
                  HouseNr: request.from?.houseNumber || this.config.defaultSenderAddress?.houseNumber || "",
                  Zipcode:
                    request.from?.postalCode || this.config.defaultSenderAddress?.postalCode || "",
                  City: request.from?.city || this.config.defaultSenderAddress?.city || "",
                  CountryCode:
                    request.from?.country?.toUpperCase() ||
                    this.config.defaultSenderAddress?.country?.toUpperCase() ||
                    "NL",
                },
              ],
            },
            Contacts: {
              Contact: {
                ContactType: "01", // Receiver
                Email: request.to.email || "",
                TelNr: request.to.phone || "",
              },
            },
            ProductCodeDelivery: productCode,
            Reference: request.reference || request.orderId,
            Remark: request.description || "",
            Dimension: {
              Weight: Math.round(request.weight / 1000), // Convert to kg
            },
          },
        },
      }

      const response = await fetch(`${this.getApiUrl()}/v1/shipment`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`PostNL label creation failed: ${error}`)
      }

      const data = await response.json()
      const shipment = data.ResponseShipments?.ResponseShipment

      if (!shipment) {
        throw new Error("No shipment data returned from PostNL")
      }

      const barcode = shipment.Barcode
      const labelData = shipment.Labels?.Label?.[0]?.Content

      return {
        trackingNumber: barcode,
        labelUrl: ``, // PostNL returns base64 in response
        trackingUrl: `https://postnl.nl/tracktrace/?B=${barcode}#lang=en`,
        carrier: "postnl",
        service: service,
        cost: this.getServicePrice(service, request.to.country),
      }
    } catch (error) {
      this.logger.error(`[PostNL] Failed to create label: ${error}`)
      throw error
    }
  }

  private getProductCode(service: string, country: string): string {
    const isNL = country.toUpperCase() === "NL"

    const codes: Record<string, string> = {
      standard: isNL ? "3085" : "4944", // NL standard / BE standard
      evening: "3090", // NL only
      express: isNL ? "3189" : "4945", // Same day / Express
      mailbox: "2928", // Brievenbuspakje
    }

    return codes[service] || codes.standard
  }

  private getServicePrice(service: string, country: string): number {
    const isNL = country.toUpperCase() === "NL"

    const prices: Record<string, number> = {
      standard: isNL ? 695 : 850,
      evening: 1195,
      express: isNL ? 1995 : 2495,
      mailbox: 425,
    }

    return prices[service] || prices.standard
  }

  /**
   * Get tracking information from PostNL
   */
  async getTracking(trackingNumber: string): Promise<TrackingInfo> {
    try {
      const response = await fetch(
        `${this.getApiUrl()}/v1/tracktrace?barcode=${encodeURIComponent(trackingNumber)}`,
        {
          method: "GET",
          headers: this.getAuthHeaders(),
        }
      )

      if (!response.ok) {
        throw new Error(`PostNL tracking fetch failed: ${response.statusText}`)
      }

      const data = await response.json()
      const shipment = data.ResponseShipments?.ResponseShipment?.[0]

      if (!shipment) {
        throw new Error(`Shipment not found: ${trackingNumber}`)
      }

      const events: TrackingEvent[] =
        shipment.Events?.Event?.map((e: any) => ({
          timestamp: new Date(e.Date + "T" + e.Time),
          status: this.mapStatus(e.Code),
          location: e.Location?.City,
          description: e.Description,
        })) || []

      events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

      return {
        trackingNumber,
        carrier: "postnl",
        status: events[0]?.status || "pending",
        events,
        estimatedDelivery: shipment.ExpectedDeliveryDate
          ? new Date(shipment.ExpectedDeliveryDate)
          : undefined,
      }
    } catch (error) {
      this.logger.error(`[PostNL] Failed to get tracking: ${error}`)
      throw error
    }
  }

  /**
   * Validate address with PostNL
   */
  async validateAddress(address: Address): Promise<{ valid: boolean; suggestions?: string[] }> {
    try {
      const response = await fetch(
        `${this.getApiUrl()}/v1/address/checkout?` +
          new URLSearchParams({
            countryCode: address.country.toUpperCase(),
            postalCode: address.postalCode,
            city: address.city,
            street: address.street,
          }),
        {
          method: "GET",
          headers: this.getAuthHeaders(),
        }
      )

      if (!response.ok) {
        return { valid: false }
      }

      const data = await response.json()

      return {
        valid: data.valid || false,
        suggestions: data.suggestions?.map((s: any) =>
          `${s.street}, ${s.postalCode} ${s.city}`
        ),
      }
    } catch (error) {
      this.logger.warn(`[PostNL] Address validation failed: ${error}`)
      return { valid: true } // Fallback on error
    }
  }

  private mapStatus(postnlCode: string): TrackingEvent["status"] {
    // PostNL event codes mapping
    // Reference: https://developer.postnl.nl/browse-apis/track-and-trace/standard-mail/
    const code = postnlCode.toUpperCase()

    if (code.startsWith("1")) return "pending" // Pre-announcement
    if (code.startsWith("2")) return "in_transit" // Collected / in sorting
    if (code.startsWith("3")) return "in_transit" // In distribution
    if (code.startsWith("4")) return "out_for_delivery" // Out for delivery
    if (code.startsWith("5")) return "delivered" // Delivered
    if (code.startsWith("8") || code.startsWith("9")) return "exception" // Exception / return

    return "in_transit"
  }
}
