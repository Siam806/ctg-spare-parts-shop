import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SHIPPING_MODULE } from "../../../../modules/shipping"
import ShippingModuleService from "../../../../modules/shipping/service"
import { ModuleRegistrationName } from "@medusajs/framework/utils"

/**
 * POST /store/checkout/shipping-rates
 *
 * Get available shipping rates for the cart based on shipping address.
 * Fetches live rates from all configured carriers.
 *
 * SL-01, SC-03: Shipping methods shown with live carrier rates
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const shippingService: ShippingModuleService = req.scope.resolve(SHIPPING_MODULE)
  const cartModuleService = req.scope.resolve(ModuleRegistrationName.CART)
  const logger = req.scope.resolve("logger")

  const customerId = (req as any).auth_context?.actor_id
  if (!customerId) {
    return res.status(401).json({
      type: "unauthorized",
      message: "Authentication required",
    })
  }

  const { cartId, shippingAddress } = req.body as {
    cartId: string
    shippingAddress: {
      country_code: string
      postal_code: string
    }
  }

  if (!cartId || !shippingAddress?.country_code || !shippingAddress?.postal_code) {
    return res.status(400).json({
      type: "invalid_data",
      message: "cartId, shippingAddress.country_code, and shippingAddress.postal_code are required",
    })
  }

  try {
    // Get cart to calculate weight
    const cart = await cartModuleService.retrieveCart(cartId, {
      relations: ["items", "items.variant"],
    })

    if (!cart) {
      return res.status(404).json({
        type: "not_found",
        message: "Cart not found",
      })
    }

    // Calculate total weight from cart items (grams)
    // Default to 1000g if no weight data available
    let totalWeight = 1000
    if (cart.items) {
      totalWeight = cart.items.reduce((sum: number, item: any) => {
        const itemWeight = item.variant?.weight || 500 // Default 500g per item
        return sum + (itemWeight * item.quantity)
      }, 0)
      // Add packaging buffer
      totalWeight += 100
    }

    // Get sender address from config (DE-based)
    const fromCountry = process.env.SHIPPING_SENDER_COUNTRY || "DE"
    const fromPostal = process.env.SHIPPING_SENDER_POSTAL || "10115"

    // Fetch rates from all enabled carriers
    const rates = await shippingService.getRates({
      from: {
        country: fromCountry,
        postalCode: fromPostal,
      },
      to: {
        country: shippingAddress.country_code,
        postalCode: shippingAddress.postal_code,
      },
      weight: totalWeight,
    })

    logger.info(
      `[Checkout API] Fetched ${rates.length} shipping rates for cart ${cartId} to ${shippingAddress.country_code}`
    )

    // Format response with recommended carrier highlighted
    const recommendedCarriers = shippingService.getRecommendedCarriers(shippingAddress.country_code)

    return res.json({
      rates: rates.map((rate) => ({
        id: rate.id,
        carrier: rate.carrier,
        service: rate.service,
        serviceName: rate.serviceName,
        price: rate.price, // in cents
        priceFormatted: `€${(rate.price / 100).toFixed(2)}`,
        currency: rate.currency,
        transitTimeMin: rate.transitTimeMin,
        transitTimeMax: rate.transitTimeMax,
        isRecommended: recommendedCarriers[0] === rate.carrier,
        isHazmatAllowed: rate.isHazmatAllowed,
      })),
      totalWeight,
      currency: "EUR",
    })
  } catch (error: any) {
    logger.error(`[Checkout API] Failed to fetch shipping rates: ${error.message}`)
    return res.status(500).json({
      type: "error",
      message: "Failed to fetch shipping rates",
      details: error.message,
    })
  }
}
