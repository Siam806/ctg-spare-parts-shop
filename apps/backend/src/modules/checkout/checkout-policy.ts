import { calculateVAT, VATBreakdown } from "./vat-service"

export interface OrderVATBreakdownInput {
  cartItems: Array<{ unit_price: number; quantity: number }>
  shippingCountry: string
  shippingCost: number // cents
  isB2B: boolean
  hasValidVATNumber: boolean
}

export function buildOrderVATBreakdown(input: OrderVATBreakdownInput): VATBreakdown {
  const subtotal = input.cartItems.reduce(
    (sum, item) => sum + item.unit_price * item.quantity,
    0
  )

  return calculateVAT({
    subtotal,
    shippingCost: input.shippingCost,
    shippingCountry: input.shippingCountry,
    customerCountry: input.shippingCountry, // use shipping country as proxy
    hasValidVATNumber: input.hasValidVATNumber,
    isB2B: input.isB2B,
  })
}

export type CheckoutAvailabilityState =
  | "in_stock"
  | "low_stock"
  | "backorder"
  | "out_of_stock"
  | "special_order"

export interface CheckoutCartItemLike {
  id: string
  title: string
  quantity: number
  variant?: {
    manage_inventory?: boolean
    allow_backorder?: boolean
    inventory_quantity?: number | null
    metadata?: Record<string, any> | null
  } | null
  product?: {
    metadata?: Record<string, any> | null
  } | null
}

export interface CheckoutAvailabilityItem {
  item_id: string
  title: string
  quantity: number
  availability: CheckoutAvailabilityState
  available_date: Date | null
}

export interface CheckoutAvailabilityResult {
  hasSplitShipment: boolean
  warnings: string[]
  items: CheckoutAvailabilityItem[]
}

export interface CheckoutShippingAddressInput {
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

export interface CheckoutOrderShippingAddress {
  first_name: string
  last_name: string
  company_name: string
  address_1: string
  address_2: string
  city: string
  postal_code: string
  province: string
  country_code: string
  phone: string
}

const BACKORDER_DAYS = 7
const OUT_OF_STOCK_DAYS = 14
const SPECIAL_ORDER_DAYS = 21

function createAvailabilityDate(daysFromNow: number, now: number): Date {
  return new Date(now + daysFromNow * 24 * 60 * 60 * 1000)
}

export function splitShippingAddressName(name: string): { firstName: string; lastName: string } {
  const trimmedName = name.trim()

  if (!trimmedName) {
    return { firstName: "", lastName: "" }
  }

  const [firstName, ...rest] = trimmedName.split(/\s+/)

  return {
    firstName,
    lastName: rest.join(" "),
  }
}

export function toOrderShippingAddress(address: CheckoutShippingAddressInput): CheckoutOrderShippingAddress {
  const { firstName, lastName } = splitShippingAddressName(address.name)

  return {
    first_name: firstName,
    last_name: lastName,
    company_name: address.company_name || "",
    address_1: address.address_1,
    address_2: address.address_2 || "",
    city: address.city,
    postal_code: address.postal_code,
    province: address.province || "",
    country_code: address.country_code,
    phone: address.phone || "",
  }
}

export function getItemAvailability(item: CheckoutCartItemLike, now: number = Date.now()): CheckoutAvailabilityItem {
  const variant = item.variant
  let availability: CheckoutAvailabilityState = "in_stock"
  let availableDate: Date | null = null

  if (variant) {
    if (!variant.manage_inventory) {
      availability = "in_stock"
    } else if (variant.allow_backorder) {
      availability = "backorder"
      availableDate = createAvailabilityDate(BACKORDER_DAYS, now)
    } else if ((variant.inventory_quantity || 0) < item.quantity) {
      availability = "out_of_stock"
      availableDate = createAvailabilityDate(OUT_OF_STOCK_DAYS, now)
    } else if ((variant.inventory_quantity || 0) <= 5) {
      availability = "low_stock"
    }

    if (variant.metadata?.special_order || item.product?.metadata?.special_order) {
      availability = "special_order"
      availableDate = createAvailabilityDate(SPECIAL_ORDER_DAYS, now)
    }
  }

  return {
    item_id: item.id,
    title: item.title,
    quantity: item.quantity,
    availability,
    available_date: availableDate,
  }
}

export function buildCheckoutAvailability(
  items: CheckoutCartItemLike[] = [],
  now: number = Date.now()
): CheckoutAvailabilityResult {
  const availabilityItems = items.map((item) => getItemAvailability(item, now))
  const dates = availabilityItems
    .filter((item) => item.available_date)
    .map((item) => item.available_date!.toDateString())

  const hasSplitShipment = [...new Set(dates)].length > 1
  const warnings: string[] = []

  if (hasSplitShipment) {
    warnings.push("Your order will be shipped in multiple deliveries due to different item availability dates")
  }

  availabilityItems.forEach((item) => {
    if (item.availability === "backorder") {
      warnings.push(`${item.title}: Available on backorder (approx. 7 days)`)
    } else if (item.availability === "out_of_stock") {
      warnings.push(`${item.title}: Out of stock (approx. 14 days)`)
    } else if (item.availability === "special_order") {
      warnings.push(`${item.title}: Special order item (approx. 21 days)`)
    }
  })

  return {
    hasSplitShipment,
    warnings,
    items: availabilityItems,
  }
}

export interface OrderSplitShipmentResult {
  hasSplitShipment: boolean
  messages: string[]
}

/**
 * Determine whether an order's items will ship in multiple deliveries
 * and produce buyer-facing warning messages.
 * Pure function — delegates to buildCheckoutAvailability.
 */
export function buildOrderSplitShipment(
  items: CheckoutCartItemLike[]
): OrderSplitShipmentResult {
  const result = buildCheckoutAvailability(items)
  return {
    hasSplitShipment: result.hasSplitShipment,
    messages: result.warnings,
  }
}