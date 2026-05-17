import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import ShippingModuleService from "../../../../modules/shipping/service"
import { SHIPPING_MODULE } from "../../../../modules/shipping"

/**
 * GET /shipping/tracking/:trackingNumber
 *
 * Get tracking information for a shipment.
 * Query params:
 * - carrier: optional carrier hint (sendcloud|postnl)
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const shippingService: ShippingModuleService = req.scope.resolve(SHIPPING_MODULE)

  const { trackingNumber } = req.params
  const { carrier } = req.query

  if (!trackingNumber) {
    res.status(400).json({
      error: "Tracking number is required",
    })
    return
  }

  try {
    const tracking = await shippingService.getTracking(
      trackingNumber,
      carrier ? (carrier as any) : undefined
    )

    res.json({
      tracking_number: tracking.trackingNumber,
      carrier: tracking.carrier,
      status: tracking.status,
      estimated_delivery: tracking.estimatedDelivery,
      events: tracking.events.map((event) => ({
        timestamp: event.timestamp,
        status: event.status,
        location: event.location,
        description: event.description,
      })),
    })
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch tracking information",
      message: error instanceof Error ? error.message : String(error),
    })
  }
}
