import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { checkoutWorkflow } from "../../../../workflows/checkout"
import { CUSTOMER_ADDRESS_MODULE } from "../../../../modules/customer-address"
import CustomerAddressModuleService from "../../../../modules/customer-address/service"
import { ModuleRegistrationName } from "@medusajs/framework/utils"

/**
 * POST /store/checkout/complete
 *
 * Complete the checkout and create an order.
 * This is the final step that converts cart to order.
 *
 * SC-03, SC-04, OM-01: Checkout → Order in pending_payment state
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerAddressService: CustomerAddressModuleService = req.scope.resolve(CUSTOMER_ADDRESS_MODULE)
  const cartModuleService = req.scope.resolve(ModuleRegistrationName.CART)
  const logger = req.scope.resolve("logger")

  const customerId = (req as any).auth_context?.actor_id
  if (!customerId) {
    return res.status(401).json({
      type: "unauthorized",
      message: "Authentication required",
    })
  }

  const {
    cartId,
    shippingAddressId,
    shippingAddress,
    shippingMethod,
    poReference,
    vatNumber,
    metadata,
  } = req.body as {
    cartId: string
    shippingAddressId?: string
    shippingAddress?: {
      name: string
      company_name?: string
      address_1: string
      address_2?: string
      city: string
      postal_code: string
      province?: string
      country_code: string
      phone?: string
    }
    shippingMethod: {
      carrier: string
      service: string
      price: number // in cents
    }
    poReference?: string
    vatNumber?: string
    metadata?: Record<string, any>
  }

  // Validate required fields
  if (!cartId) {
    return res.status(400).json({
      type: "invalid_data",
      message: "cartId is required",
    })
  }

  if (!shippingAddressId && !shippingAddress) {
    return res.status(400).json({
      type: "invalid_data",
      message: "Either shippingAddressId or shippingAddress is required",
    })
  }

  if (!shippingMethod?.carrier || !shippingMethod?.service || shippingMethod?.price === undefined) {
    return res.status(400).json({
      type: "invalid_data",
      message: "shippingMethod with carrier, service, and price is required",
    })
  }

  try {
    // Verify cart exists and belongs to customer
    const cart = await cartModuleService.retrieveCart(cartId, {
      relations: ["items", "customer"],
    })

    if (!cart) {
      return res.status(404).json({
        type: "not_found",
        message: "Cart not found",
      })
    }

    if (cart.customer_id !== customerId) {
      return res.status(403).json({
        type: "unauthorized",
        message: "Cart does not belong to authenticated customer",
      })
    }

    // If using saved address, verify it exists and belongs to customer
    if (shippingAddressId) {
      const addresses = await customerAddressService.listCustomerAddresses({
        id: shippingAddressId,
        customer_id: customerId,
      })

      if (addresses.length === 0) {
        return res.status(404).json({
          type: "not_found",
          message: "Shipping address not found",
        })
      }
    }

    // Run checkout workflow
    const result = await checkoutWorkflow(req.scope).run({
      input: {
        cartId,
        customerId,
        shippingAddressId,
        shippingAddress,
        carrier: shippingMethod.carrier,
        service: shippingMethod.service,
        shippingCost: shippingMethod.price,
        poReference,
        vatNumber,
        metadata: {
          ...metadata,
          checkout_source: "api",
        },
      },
    })

    logger.info(
      `[Checkout API] Order ${result.result.orderId} created from cart ${cartId} for customer ${customerId}`
    )

    return res.status(201).json({
      order: {
        id: result.result.orderId,
        order_number: result.result.orderNumber,
        status: result.result.status,
        payment_status: result.result.paymentStatus,
        fulfillment_status: result.result.fulfillmentStatus,
      },
      summary: {
        subtotal: result.result.vatBreakdown.subtotal,
        shipping_cost: result.result.shippingCost,
        vat_amount: result.result.vatBreakdown.vatAmount,
        vat_rate: result.result.vatBreakdown.vatRate,
        total: result.result.vatBreakdown.total,
        is_reverse_charge: result.result.vatBreakdown.isReverseCharge,
        split_shipment_warning: result.result.splitShipmentWarning,
      },
      next_steps: {
        payment_required: result.result.paymentStatus === "pending",
        payment_url: null, // Will be populated when payment integration is added
      },
    })
  } catch (error: any) {
    logger.error(`[Checkout API] Checkout failed: ${error.message}`)
    return res.status(500).json({
      type: "error",
      message: "Checkout failed",
      details: error.message,
    })
  }
}
