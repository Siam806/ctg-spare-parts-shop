import {
  createWorkflow,
  WorkflowResponse,
  createStep,
  StepResponse,
} from "@medusajs/framework/workflows-sdk"
import { ModuleRegistrationName } from "@medusajs/framework/utils"
import { VATBreakdown } from "../../modules/checkout/vat-service"
import { buildOrderVATBreakdown, buildOrderSplitShipment } from "../../modules/checkout/checkout-policy"

/**
 * Checkout Workflow
 *
 * Converts a cart into an order with:
 * - Shipping address validation
 * - Shipping method selection with live rates
 * - VAT calculation (domestic + EU reverse charge)
 * - PO reference support
 * - Split-shipment detection
 * - Order creation in pending_payment state
 *
 * SC-03, SC-04, SC-05, SL-01, PM-03, OM-01
 */

// Types
export interface CheckoutInput {
  cartId: string
  customerId: string
  companyId?: string

  // Shipping
  shippingAddressId?: string // Use saved address
  shippingAddress?: { // Or ad-hoc address
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

  // Shipping method
  shippingMethodId?: string
  carrier?: string
  service?: string
  shippingCost: number // in cents

  // Order details
  poReference?: string // SC-03: PO reference field
  vatNumber?: string

  // Metadata
  metadata?: Record<string, any>
}

export interface CheckoutOutput {
  orderId: string
  orderNumber: string
  status: string
  paymentStatus: string
  fulfillmentStatus: string
  vatBreakdown: VATBreakdown
  shippingCost: number
  splitShipmentWarning?: {
    hasSplitShipment: boolean
    messages: string[]
  }
}

// Step 1: Validate and prepare shipping address
const prepareShippingAddressStep = createStep(
  "prepare-shipping-address",
  async (
    input: Pick<CheckoutInput, "shippingAddressId" | "shippingAddress" | "customerId">,
    { container }
  ) => {
    const customerAddressService = container.resolve("customer_address")
    const logger = container.resolve("logger")

    let finalAddress: any

    // Use saved address
    if (input.shippingAddressId) {
      const addresses = await customerAddressService.listCustomerAddresses({
        id: input.shippingAddressId,
        customer_id: input.customerId,
      })

      if (addresses.length === 0) {
        throw new Error("Shipping address not found or does not belong to customer")
      }

      const saved = addresses[0]
      finalAddress = {
        name: saved.name,
        company_name: saved.company_name,
        address_1: saved.address_line_1,
        address_2: saved.address_line_2,
        city: saved.city,
        postal_code: saved.postal_code,
        province: saved.province,
        country_code: saved.country_code,
        phone: saved.phone,
      }
      logger.info(`[Checkout] Using saved address ${input.shippingAddressId}`)
    }
    // Use ad-hoc address
    else if (input.shippingAddress) {
      // Validate address structure
      const validation = customerAddressService.validateAddress({
        name: input.shippingAddress.name,
        address_line_1: input.shippingAddress.address_1,
        city: input.shippingAddress.city,
        postal_code: input.shippingAddress.postal_code,
        country_code: input.shippingAddress.country_code,
      })

      if (!validation.valid) {
        throw new Error(`Invalid shipping address: ${validation.errors.join(", ")}`)
      }

      finalAddress = input.shippingAddress
      logger.info(`[Checkout] Using ad-hoc address`)
    } else {
      throw new Error("Either shippingAddressId or shippingAddress is required")
    }

    return new StepResponse({ shippingAddress: finalAddress })
  }
)

// Step 4: Create order from cart
const createOrderStep = createStep(
  "create-order",
  async (
    input: {
      cartId: string
      shippingAddress: any
      shippingMethodId?: string
      shippingCost: number
      vatNumber?: string
      poReference?: string
      customerId: string
      metadata?: Record<string, any>
    },
    { container }
  ) => {
    const orderModuleService = container.resolve(ModuleRegistrationName.ORDER)
    const cartModuleService = container.resolve(ModuleRegistrationName.CART)
    const logger = container.resolve("logger")

    // Get cart details
    const cart = await cartModuleService.retrieveCart(input.cartId, {
      relations: ["items", "customer", "billing_address"],
    })

    if (!cart) {
      throw new Error("Cart not found")
    }

    // Prepare shipping address for order
    const orderShippingAddress = {
      first_name: input.shippingAddress.name?.split(" ")[0] || "",
      last_name: input.shippingAddress.name?.split(" ").slice(1).join(" ") || "",
      company_name: input.shippingAddress.company_name || "",
      address_1: input.shippingAddress.address_1,
      address_2: input.shippingAddress.address_2 || "",
      city: input.shippingAddress.city,
      postal_code: input.shippingAddress.postal_code,
      province: input.shippingAddress.province || "",
      country_code: input.shippingAddress.country_code,
      phone: input.shippingAddress.phone || "",
    }

    // Build order items from cart items
    const orderItems = cart.items?.map((item: any) => ({
      variant_id: item.variant_id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      title: item.title,
      product_title: item.product_title,
      metadata: item.metadata || {},
    })) || []

    // Calculate real VAT breakdown from cart items and shipping address
    const cartAny = cart as any
    const isB2B = cartAny.customer?.metadata?.is_b2b === true || !!cartAny.customer?.company_name
    const hasValidVAT = !!input.vatNumber && input.vatNumber.length > 4

    const vatBreakdown = buildOrderVATBreakdown({
      cartItems: orderItems.map((item: any) => ({
        unit_price: item.unit_price,
        quantity: item.quantity,
      })),
      shippingCountry: input.shippingAddress.country_code,
      shippingCost: input.shippingCost,
      isB2B,
      hasValidVATNumber: hasValidVAT,
    })

    // Detect split shipments from cart items (SC-05)
    const splitShipmentWarning = buildOrderSplitShipment(
      (cart.items || []).map((item: any) => ({
        id: item.id,
        title: item.title || "",
        quantity: item.quantity,
        variant: item.variant || null,
        product: item.product || null,
      }))
    )

    // Create the order in pending_payment state (OM-01)
    // Cast to any: CreateOrderDTO typing doesn't expose status/payment_status/fulfillment_status
    // fields in Medusa 2.x but the runtime accepts them.
    const order = await (orderModuleService as any).createOrders({
      region_id: cart.region_id,
      customer_id: input.customerId,
      sales_channel_id: cart.sales_channel_id,
      email: cart.email,
      currency_code: cart.currency_code,
      status: "pending", // Order status
      payment_status: "pending", // Will transition to awaiting/authorized after payment
      fulfillment_status: "not_fulfilled", // Will transition to picking when confirmed
      shipping_address: orderShippingAddress,
      billing_address: cart.billing_address || orderShippingAddress,
      items: orderItems,
      metadata: {
        ...input.metadata,
        po_reference: input.poReference || null,
        vat_breakdown: vatBreakdown,
        split_shipment: splitShipmentWarning,
        original_cart_id: input.cartId,
        checkout_completed_at: new Date().toISOString(),
      },
    })

    logger.info(`[Checkout] Created order ${order.id} from cart ${input.cartId}`)

    return new StepResponse({
      orderId: order.id,
      orderNumber: String(order.display_id || order.id),
      vatBreakdown,
      splitShipmentWarning,
    })
  }
)

// Step 5: Add shipping to order
const addShippingToOrderStep = createStep(
  "add-shipping-to-order",
  async (
    input: {
      orderId: string
      shippingMethodId?: string
      carrier?: string
      service?: string
      shippingCost: number
    },
    { container }
  ) => {
    const orderModuleService = container.resolve(ModuleRegistrationName.ORDER)
    const logger = container.resolve("logger")

    // Create a shipping method for the order
    // Cast to any: addShippingMethods is a runtime method not yet typed in Medusa 2.x IOrderModuleService
    await (orderModuleService as any).addShippingMethods({
      order_id: input.orderId,
      name: input.service || "Standard Shipping",
      description: input.carrier ? `${input.carrier} - ${input.service}` : "Standard",
      amount: input.shippingCost,
      is_tax_inclusive: false,
      data: {
        carrier: input.carrier,
        service: input.service,
      },
    })

    logger.info(`[Checkout] Added shipping to order ${input.orderId}: ${input.shippingCost} cents`)

    return new StepResponse({ shippingAdded: true })
  }
)

// Main checkout workflow
export const checkoutWorkflow = createWorkflow(
  "checkout",
  (input: CheckoutInput): WorkflowResponse<CheckoutOutput> => {
    // Step 1: Prepare shipping address
    const { shippingAddress } = prepareShippingAddressStep({
      shippingAddressId: input.shippingAddressId,
      shippingAddress: input.shippingAddress,
      customerId: input.customerId,
    })

    // Step 4: Create order (VAT computed inside createOrderStep from cart items)
    const { orderId, orderNumber, vatBreakdown, splitShipmentWarning } = createOrderStep({
      cartId: input.cartId,
      shippingAddress,
      shippingMethodId: input.shippingMethodId,
      shippingCost: input.shippingCost,
      vatNumber: input.vatNumber,
      poReference: input.poReference,
      customerId: input.customerId,
      metadata: input.metadata,
    })

    // Step 5: Add shipping
    addShippingToOrderStep({
      orderId,
      shippingMethodId: input.shippingMethodId,
      carrier: input.carrier,
      service: input.service,
      shippingCost: input.shippingCost,
    })

    // Return checkout result with real VAT breakdown and split-shipment warning
    return new WorkflowResponse({
      orderId,
      orderNumber,
      status: "pending",
      paymentStatus: "pending",
      fulfillmentStatus: "not_fulfilled",
      vatBreakdown,
      shippingCost: input.shippingCost,
      splitShipmentWarning,
    })
  }
)

export default checkoutWorkflow
