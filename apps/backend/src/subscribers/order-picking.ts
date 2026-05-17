import {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework"
import {
  ModuleRegistrationName,
  ContainerRegistrationKeys,
} from "@medusajs/framework/utils"
import { createShipmentWorkflow } from "../workflows/create-shipment"
import { Modules } from "@medusajs/framework/utils"

/**
 * Subscriber: Order Entering Picking State
 *
 * Triggered when an order transitions to the "picking" fulfillment status.
 * Automatically creates a shipping label via the configured carrier.
 *
 * SL-02: Shipping labels are generated automatically when an order enters picking state
 */
export default async function orderPickingHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const orderModuleService = container.resolve(ModuleRegistrationName.ORDER)

  const orderId = data.id
  logger.info(`[OrderPicking] Order ${orderId} entered picking state`)

  try {
    // Fetch full order details
    const order = await orderModuleService.retrieveOrder(orderId, {
      relations: ["items", "shipping_address", "fulfillments"],
    })

    if (!order) {
      logger.error(`[OrderPicking] Order ${orderId} not found`)
      return
    }

    // Check if we already have a shipment (avoid duplicates)
    const { data: existingShipments } = await query.graph({
      entity: "shipment_record",
      fields: ["id"],
      filters: { order_id: orderId },
    })

    if (existingShipments.length > 0) {
      logger.info(`[OrderPicking] Order ${orderId} already has shipment(s), skipping`)
      return
    }

    // Build address objects
    const shippingAddress = order.shipping_address
    if (!shippingAddress) {
      logger.error(`[OrderPicking] Order ${orderId} has no shipping address`)
      return
    }

    // Get sender address from config or use default
    const fromAddress = {
      name: process.env.SHIPPING_SENDER_NAME || "CTG Spare Parts",
      company: process.env.SHIPPING_SENDER_COMPANY || "CTG Parts GmbH",
      street: process.env.SHIPPING_SENDER_STREET || "Industriestraße",
      houseNumber: process.env.SHIPPING_SENDER_HOUSE_NUMBER || "1",
      city: process.env.SHIPPING_SENDER_CITY || "Berlin",
      postalCode: process.env.SHIPPING_SENDER_POSTAL || "10115",
      country: process.env.SHIPPING_SENDER_COUNTRY || "DE",
      phone: process.env.SHIPPING_SENDER_PHONE,
      email: process.env.SHIPPING_SENDER_EMAIL,
    }

    const toAddress = {
      name: `${shippingAddress.first_name} ${shippingAddress.last_name}`.trim(),
      company: (shippingAddress as any).company_name || "",
      street: shippingAddress.address_1 || "",
      houseNumber: "", // Could parse from address if needed
      city: shippingAddress.city || "",
      postalCode: shippingAddress.postal_code || "",
      country: shippingAddress.country_code || "NL",
      phone: shippingAddress.phone || "",
      email: order.email || "",
    }

    // Build items list with weights
    const items = order.items?.map((item: any) => ({
      id: item.product_variant_id,
      quantity: item.quantity,
      // Weight will be fetched in workflow if not provided
    })) || []

    // Check for hazmat products
    const { data: productData } = await query.graph({
      entity: "product",
      fields: ["metadata"],
      filters: {
        id: order.items?.map((i: any) => i.product_id) || [],
      },
    })

    const isHazmat = productData.some(
      (p: any) => p.metadata?.hazmat === true || p.metadata?.hazardous === true
    )

    // Determine carrier based on destination (DE-based)
    // Use SendCloud for most destinations (provides DHL/DPD/UPS)
    // PostNL only for NL/BE where it has advantage
    const carrier: any = ["NL", "BE"].includes(toAddress.country) ? "sendcloud" : "sendcloud"

    // Run shipment creation workflow
    const workflowResult = await createShipmentWorkflow(container).run({
      input: {
        orderId,
        items,
        fromAddress: fromAddress as any,
        toAddress: toAddress as any,
        carrier,
        isHazmat,
      },
    })

    // Access result from workflow response
    const result = workflowResult.result

    logger.info(
      `[OrderPicking] Created shipment for order ${orderId}: ${result.trackingNumber} (${result.carrier})`
    )

    // Update order with tracking info (optional metadata)
    await orderModuleService.updateOrders([
      {
        id: orderId,
        metadata: {
          ...(order.metadata || {}),
          tracking_number: result.trackingNumber,
          tracking_url: result.trackingUrl,
          carrier: result.carrier,
          label_created_at: new Date().toISOString(),
        },
      },
    ])

    // TODO: Trigger shipping notification email (requires notification module)
    // This will be implemented as part of OM-02
  } catch (error) {
    logger.error(`[OrderPicking] Failed to create shipment for ${orderId}: ${error}`)
    // TODO: Alert admin about the failure
  }
}

export const config: SubscriberConfig = {
  event: ["order.fulfillment_status_changed"],
  context: {
    subscriberId: "order-picking-handler",
  },
}
