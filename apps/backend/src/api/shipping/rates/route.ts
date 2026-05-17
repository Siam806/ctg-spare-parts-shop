import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import ShippingModuleService from "../../../modules/shipping/service"
import { SHIPPING_MODULE } from "../../../modules/shipping"

/**
 * GET /shipping/rates
 *
 * Get shipping rates from enabled carriers for a given destination.
 * Query params:
 * - to_country: destination country code (ISO 3166-1 alpha-2)
 * - to_postal: destination postal code
 * - from_country: origin country code (optional, defaults to NL)
 * - from_postal: origin postal code (optional)
 * - weight: parcel weight in grams
 * - length, width, height: dimensions in cm (optional)
 * - value: parcel value in cents for insurance (optional)
 * - hazmat: true if contains hazardous materials (optional)
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const shippingService: ShippingModuleService = req.scope.resolve(SHIPPING_MODULE)

  const {
    to_country,
    to_postal,
    from_country = "DE",
    from_postal = "10115",
    weight = "1000",
    length,
    width,
    height,
    value,
    hazmat,
  } = req.query

  if (!to_country || !to_postal) {
    res.status(400).json({
      error: "Missing required parameters: to_country, to_postal",
    })
    return
  }

  try {
    const rates = await shippingService.getRates({
      from: {
        country: String(from_country),
        postalCode: String(from_postal),
      },
      to: {
        country: String(to_country),
        postalCode: String(to_postal),
      },
      weight: parseInt(String(weight), 10),
      dimensions:
        length && width && height
          ? {
              length: parseInt(String(length), 10),
              width: parseInt(String(width), 10),
              height: parseInt(String(height), 10),
            }
          : undefined,
      value: value ? parseInt(String(value), 10) : undefined,
      isHazmat: hazmat === "true",
    })

    res.json({
      rates: rates.map((rate) => ({
        id: rate.id,
        carrier: rate.carrier,
        service: rate.service,
        name: rate.serviceName,
        price: rate.price,
        currency: rate.currency,
        transit_time: rate.transitTimeMax
          ? `${rate.transitTimeMin || 1}-${rate.transitTimeMax} days`
          : undefined,
        hazmat_allowed: rate.isHazmatAllowed,
      })),
    })
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch shipping rates",
      message: error instanceof Error ? error.message : String(error),
    })
  }
}
