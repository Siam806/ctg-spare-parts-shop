import { Logger } from "@medusajs/framework/types"
import {
  CarrierRate,
  ShipmentRequest,
  LabelResult,
  TrackingInfo,
  TrackingEvent,
  Address,
  type SendCloudConfig,
} from "../types"

/**
 * SendCloud Client
 *
 * Integration with SendCloud API for multi-carrier shipping.
 * SendCloud aggregates DHL, DPD, UPS, PostNL, and many others.
 *
 * API Docs: https://docs.sendcloud.sc/api/v2/shipping/
 */
export class SendCloudClient {
  private readonly baseUrl = "https://panel.sendcloud.sc/api/v2"
  private readonly config: SendCloudConfig
  private readonly logger: Logger

  constructor(config: SendCloudConfig, logger?: Logger) {
    this.config = config
    this.logger = logger || console as unknown as Logger
  }

  private getAuthHeaders(): Record<string, string> {
    const auth = Buffer.from(`${this.config.apiKey}:${this.config.apiSecret}`).toString("base64")
    return {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    }
  }

  /**
   * Get available shipping rates from SendCloud
   */
  async getRates(request: {
    from: { country: string; postalCode: string }
    to: { country: string; postalCode: string }
    weight: number
    dimensions?: { length: number; width: number; height: number }
    value?: number
    isHazmat?: boolean
  }): Promise<CarrierRate[]> {
    try {
      // SendCloud requires shipping method list first, then calculate price
      const response = await fetch(`${this.baseUrl}/shipping_methods`, {
        method: "GET",
        headers: this.getAuthHeaders(),
      })

      if (!response.ok) {
        throw new Error(`SendCloud API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      // Filter and map to our rate format
      const rates: CarrierRate[] = data.shipping_methods
        ?.filter((method: any) => {
          // Filter by weight
          if (method.max_weight && request.weight > method.max_weight * 1000) {
            return false
          }
          // Filter by country eligibility
          const countries = method.countries || []
          const toCountry = countries.find((c: any) => c.iso_2 === request.to.country.toUpperCase())
          if (!toCountry) return false

          // Hazmat filter
          if (request.isHazmat && !method.allows_hazmat) {
            return false
          }

          return true
        })
        .map((method: any) => {
          const country = method.countries.find(
            (c: any) => c.iso_2 === request.to.country.toUpperCase()
          )

          return {
            id: `sendcloud_${method.id}`,
            carrier: "sendcloud" as const,
            service: method.code || method.name.toLowerCase().replace(/\s+/g, "_"),
            serviceName: method.name,
            price: Math.round((country?.price || 0) * 100), // convert to cents
            currency: "eur",
            transitTimeMin: method.transit_time_min,
            transitTimeMax: method.transit_time_max,
            isHazmatAllowed: method.allows_hazmat || false,
          }
        }) || []

      return rates
    } catch (error) {
      this.logger.error(`[SendCloud] Failed to get rates: ${error}`)
      throw error
    }
  }

  /**
   * Create shipping label
   */
  async createLabel(request: ShipmentRequest): Promise<LabelResult> {
    try {
      const payload = {
        parcel: {
          name: request.to.name,
          company_name: request.to.company || "",
          address: request.to.street,
          house_number: request.to.houseNumber || "",
          city: request.to.city,
          postal_code: request.to.postalCode,
          country: request.to.country.toUpperCase(),
          telephone: request.to.phone || "",
          email: request.to.email || "",
          order_number: request.orderId,
          weight: request.weight / 1000, // SendCloud uses kg
          insured_value: request.value ? request.value / 100 : 0, // euros
          total_order_value: request.value ? request.value / 100 : 0,
          quantity: 1,
          shipping_method_checkout_name: request.service || "Standard",
          sender_address: this.config.defaultSenderAddress
            ? {
                company_name: this.config.defaultSenderAddress.company || "",
                name: this.config.defaultSenderAddress.name,
                address: this.config.defaultSenderAddress.street,
                house_number: this.config.defaultSenderAddress.houseNumber || "",
                city: this.config.defaultSenderAddress.city,
                postal_code: this.config.defaultSenderAddress.postalCode,
                country: this.config.defaultSenderAddress.country.toUpperCase(),
                telephone: this.config.defaultSenderAddress.phone || "",
                email: this.config.defaultSenderAddress.email || "",
              }
            : undefined,
          // Hazmat settings
          customs_invoice_nr: request.reference || request.orderId,
          customs_shipment_type: request.isHazmat ? 4 : 2, // 4 = gift, 2 = commercial
        },
      }

      const response = await fetch(`${this.baseUrl}/parcels`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`SendCloud label creation failed: ${error}`)
      }

      const data = await response.json()
      const parcel = data.parcel

      return {
        trackingNumber: parcel.tracking_number,
        labelUrl: parcel.label.normal_printer,
        trackingUrl: `https://tracking.sendcloud.sc/?code=${parcel.tracking_number}`,
        carrier: "sendcloud",
        service: request.service || "standard",
        cost: Math.round((parcel.price_total || 0) * 100), // cents
      }
    } catch (error) {
      this.logger.error(`[SendCloud] Failed to create label: ${error}`)
      throw error
    }
  }

  /**
   * Get tracking information
   */
  async getTracking(trackingNumber: string): Promise<TrackingInfo> {
    try {
      // First find parcel by tracking number
      const response = await fetch(
        `${this.baseUrl}/parcels?tracking_number=${encodeURIComponent(trackingNumber)}`,
        {
          method: "GET",
          headers: this.getAuthHeaders(),
        }
      )

      if (!response.ok) {
        throw new Error(`SendCloud tracking fetch failed: ${response.statusText}`)
      }

      const data = await response.json()
      const parcel = data.parcels?.[0]

      if (!parcel) {
        throw new Error(`Parcel not found: ${trackingNumber}`)
      }

      const events: TrackingEvent[] =
        parcel.status?.history?.map((h: any) => ({
          timestamp: new Date(h.timestamp),
          status: this.mapStatus(h.code),
          location: h.location,
          description: h.message,
        })) || []

      return {
        trackingNumber,
        carrier: "sendcloud",
        status: this.mapStatus(parcel.status?.code),
        events,
        estimatedDelivery: parcel.expected_delivery_date
          ? new Date(parcel.expected_delivery_date)
          : undefined,
      }
    } catch (error) {
      this.logger.error(`[SendCloud] Failed to get tracking: ${error}`)
      throw error
    }
  }

  /**
   * Validate address (using SendCloud's validation)
   */
  async validateAddress(address: Address): Promise<{ valid: boolean; suggestions?: string[] }> {
    try {
      const response = await fetch(`${this.baseUrl}/parcels/validate_address`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          address: address.street,
          house_number: address.houseNumber || "",
          city: address.city,
          postal_code: address.postalCode,
          country: address.country.toUpperCase(),
        }),
      })

      if (!response.ok) {
        return { valid: false }
      }

      const data = await response.json()
      return {
        valid: data.valid || false,
        suggestions: data.suggestions,
      }
    } catch (error) {
      this.logger.warn(`[SendCloud] Address validation failed: ${error}`)
      return { valid: true } // Fallback on error
    }
  }

  private mapStatus(sendcloudCode: string): TrackingEvent["status"] {
    const statusMap: Record<string, TrackingEvent["status"]> = {
      "1000": "pending", // Announced
      "1001": "pending", // Ready to send
      "2000": "in_transit", // En route to sorting center
      "2001": "in_transit", // At sorting center
      "2002": "in_transit", // At distribution center
      "3000": "out_for_delivery", // At delivery center
      "3001": "out_for_delivery", // Out for delivery
      "4000": "delivered", // Delivered
      "4001": "exception", // Delivery failed
      "4002": "exception", // Delivery exception
      "5000": "exception", // Return to sender
    }
    return statusMap[sendcloudCode] || "in_transit"
  }
}
