import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ModuleRegistrationName } from "@medusajs/framework/utils"
import { calculateVAT, VATCalculationInput } from "../../../../modules/checkout/vat-service"
import { CUSTOMER_ADDRESS_MODULE } from "../../../../modules/customer-address"
import CustomerAddressModuleService from "../../../../modules/customer-address/service"

/**
 * POST /store/checkout/summary
 *
 * Get order summary with VAT breakdown before confirming checkout.
 * Used to display pricing to customer before final confirmation.
 *
 * SC-04: Order summary with subtotal, shipping, VAT, grand total
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const cartModuleService = req.scope.resolve(ModuleRegistrationName.CART)
  const customerService = req.scope.resolve(ModuleRegistrationName.CUSTOMER)
  const customerAddressService: CustomerAddressModuleService = req.scope.resolve(CUSTOMER_ADDRESS_MODULE)
  const logger = req.scope.resolve("logger")

  const customerId = (req as any).auth_context?.actor_id
  if (!customerId) {
    return res.status(401).json({
      type: "unauthorized",
      message: "Authentication required",
    })
  }

  const { cartId, shippingAddressId, shippingCost, vatNumber } = req.body as {
    cartId: string
    shippingAddressId?: string
    shippingCost: number // in cents
    vatNumber?: string
  }

  if (!cartId || shippingCost === undefined) {
    return res.status(400).json({
      type: "invalid_data",
      message: "cartId and shippingCost are required",
    })
  }

  try {
    // Get cart with items
    const cart = await cartModuleService.retrieveCart(cartId, {
      relations: ["items", "items.variant", "items.product"],
    })

    if (!cart) {
      return res.status(404).json({
        type: "not_found",
        message: "Cart not found",
      })
    }

    // Calculate subtotal
    const subtotal = cart.items?.reduce((sum: number, item: any) => {
      return sum + (item.unit_price * item.quantity)
    }, 0) || 0

    // Determine shipping country and B2B status
    let shippingCountry = "NL" // Default
    let isB2B = false

    if (shippingAddressId) {
      // Use saved address
      const addresses = await customerAddressService.listCustomerAddresses({
        id: shippingAddressId,
        customer_id: customerId,
      })

      if (addresses.length > 0) {
        shippingCountry = addresses[0].country_code
      }
    }

    // Get customer for B2B check
    try {
      const customer = await customerService.retrieveCustomer(customerId)
      isB2B = customer.metadata?.is_b2b === true || !!customer.company_name
    } catch (e) {
      // Customer not found, use defaults
    }

    // Calculate VAT
    const vatInput: VATCalculationInput = {
      subtotal,
      shippingCost,
      shippingCountry,
      customerCountry: shippingCountry,
      hasValidVATNumber: !!vatNumber && vatNumber.length > 4,
      isB2B,
    }

    const vatBreakdown = calculateVAT(vatInput)

    // Check for split shipment (different availability dates)
    const availabilityWarnings: string[] = []
    const itemsWithAvailability = cart.items?.map((item: any) => {
      const variant = item.variant
      let availability = "in_stock"
      let availableDate: Date | null = null

      if (variant) {
        if (!variant.manage_inventory) {
          availability = "in_stock"
        } else if (variant.allow_backorder) {
          availability = "backorder"
          availableDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        } else if ((variant.inventory_quantity || 0) < item.quantity) {
          availability = "out_of_stock"
          availableDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
        } else if ((variant.inventory_quantity || 0) <= 5) {
          availability = "low_stock"
        }

        // Special order items
        if (variant.metadata?.special_order || item.product?.metadata?.special_order) {
          availability = "special_order"
          availableDate = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000)
        }
      }

      return {
        item_id: item.id,
        title: item.title,
        quantity: item.quantity,
        availability,
        available_date: availableDate,
      }
    }) || []

    // Detect different availability dates
    const dates = itemsWithAvailability
      .filter((i: any) => i.available_date)
      .map((i: any) => i.available_date!.toDateString())

    const uniqueDates = [...new Set(dates)]
    const hasSplitShipment = uniqueDates.length > 1

    if (hasSplitShipment) {
      availabilityWarnings.push(
        "Your order will be shipped in multiple deliveries due to different item availability dates"
      )
    }

    // Specific warnings for individual items
    itemsWithAvailability.forEach((item: any) => {
      if (item.availability === "backorder") {
        availabilityWarnings.push(`${item.title}: Available on backorder (approx. 7 days)`)
      } else if (item.availability === "out_of_stock") {
        availabilityWarnings.push(`${item.title}: Out of stock (approx. 14 days)`)
      } else if (item.availability === "special_order") {
        availabilityWarnings.push(`${item.title}: Special order item (approx. 21 days)`)
      }
    })

    logger.info(`[Checkout API] Generated summary for cart ${cartId}`)

    return res.json({
      cart_id: cartId,
      items: cart.items?.map((item: any) => ({
        id: item.id,
        title: item.title,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.unit_price * item.quantity,
      })),
      pricing: {
        subtotal,
        subtotal_formatted: `€${(subtotal / 100).toFixed(2)}`,
        shipping_cost: shippingCost,
        shipping_formatted: `€${(shippingCost / 100).toFixed(2)}`,
        vat_amount: vatBreakdown.vatAmount,
        vat_formatted: `€${(vatBreakdown.vatAmount / 100).toFixed(2)}`,
        vat_rate: vatBreakdown.vatRate,
        vat_label: vatBreakdown.isReverseCharge
          ? `VAT reverse charge (0%) - ${vatBreakdown.vatCountry}`
          : vatBreakdown.vatRate > 0
            ? `VAT ${vatBreakdown.vatRate}% (${vatBreakdown.vatCountry})`
            : "VAT exempt",
        total: vatBreakdown.total,
        total_formatted: `€${(vatBreakdown.total / 100).toFixed(2)}`,
        is_reverse_charge: vatBreakdown.isReverseCharge,
      },
      availability: {
        has_split_shipment: hasSplitShipment,
        warnings: availabilityWarnings,
        items: itemsWithAvailability,
      },
    })
  } catch (error: any) {
    logger.error(`[Checkout API] Failed to generate summary: ${error.message}`)
    return res.status(500).json({
      type: "error",
      message: "Failed to generate order summary",
      details: error.message,
    })
  }
}
