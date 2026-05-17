import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import ShippingModuleService from "../../../modules/shipping/service"
import { SHIPPING_MODULE } from "../../../modules/shipping"

/**
 * Admin API: List shipments
 *
 * GET /admin/shipments
 *
 * Query params:
 * - order_id: filter by order
 * - carrier: filter by carrier (sendcloud|postnl)
 * - status: filter by status
 * - tracking_number: search by tracking number
 * - limit: pagination limit (default 20)
 * - offset: pagination offset (default 0)
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const shippingService: ShippingModuleService = req.scope.resolve(SHIPPING_MODULE)

  const {
    order_id,
    carrier,
    status,
    tracking_number,
    limit = "20",
    offset = "0",
  } = req.query

  try {
    const filters: Record<string, any> = {}

    if (order_id) filters.order_id = order_id
    if (carrier) filters.carrier = carrier
    if (status) filters.status = status
    if (tracking_number) filters.tracking_number = tracking_number

    const [shipments, count] = await shippingService.listAndCountShipmentRecords(
      filters,
      {
        take: parseInt(String(limit), 10),
        skip: parseInt(String(offset), 10),
        order: { created_at: "DESC" },
      }
    )

    res.json({
      shipments: shipments.map((s) => ({
        id: s.id,
        order_id: s.order_id,
        carrier: s.carrier,
        service: s.service,
        tracking_number: s.tracking_number,
        tracking_url: s.tracking_url,
        label_url: s.label_url,
        status: s.status,
        cost: s.cost,
        currency: s.currency,
        weight: s.weight,
        hazmat: s.hazmat,
        created_at: s.created_at,
        shipped_at: s.shipped_at,
        delivered_at: s.delivered_at,
        to_address: s.to_address,
      })),
      count,
      limit: parseInt(String(limit), 10),
      offset: parseInt(String(offset), 10),
    })
  } catch (error) {
    res.status(500).json({
      error: "Failed to list shipments",
      message: error instanceof Error ? error.message : String(error),
    })
  }
}
