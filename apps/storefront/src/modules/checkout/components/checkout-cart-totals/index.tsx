"use client"

import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import React from "react"

/**
 * EU member state country codes (ISO 3166-1 alpha-2).
 * Mirrors the list in the backend vat-service so the label is consistent.
 */
const EU_COUNTRIES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
  "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
  "PL", "PT", "RO", "SK", "SI", "ES", "SE",
])

/**
 * Standard VAT rates by country (simplified — standard rates only).
 */
const VAT_RATES: Record<string, number> = {
  AT: 20, BE: 21, BG: 20, HR: 25, CY: 19, CZ: 21, DK: 25, EE: 22,
  FI: 25.5, FR: 20, DE: 19, GR: 24, HU: 27, IE: 23, IT: 22, LV: 21,
  LT: 21, LU: 17, MT: 18, NL: 21, PL: 23, PT: 23, RO: 19, SK: 20,
  SI: 22, ES: 21, SE: 25,
}

function deriveVATLabel(cart: HttpTypes.StoreCart): string {
  const countryCode = cart.shipping_address?.country_code?.toUpperCase() ?? "NL"
  const isB2B =
    (cart.customer as any)?.metadata?.is_b2b === true ||
    !!(cart.customer as any)?.company_name ||
    !!(cart.metadata?.company_id)
  const hasVATNumber = !!(cart.metadata?.vat_number)
  const isEU = EU_COUNTRIES.has(countryCode)

  if (!isEU) return "VAT exempt (export)"
  if (countryCode === "NL") return `VAT 21% (NL)`
  if (isB2B && hasVATNumber) return `VAT reverse charge (0%) — ${countryCode}`

  const rate = VAT_RATES[countryCode] ?? 0
  return rate > 0 ? `VAT ${rate}% (${countryCode})` : "VAT exempt"
}

type CheckoutCartTotalsProps = {
  cart: HttpTypes.StoreCart
}

/**
 * Checkout-specific totals panel.
 * Shows the standard subtotal / shipping / discount rows from CartTotals,
 * but replaces the generic "Taxes" label with a precise VAT label
 * (domestic %, EU reverse charge, or export-exempt) derived from the
 * shipping address and customer type. (SC-04, PM-03)
 */
const CheckoutCartTotals: React.FC<CheckoutCartTotalsProps> = ({ cart }) => {
  const {
    currency_code,
    total,
    tax_total,
    item_subtotal,
    shipping_subtotal,
    discount_subtotal,
  } = cart

  const vatLabel = deriveVATLabel(cart)

  return (
    <div>
      <div className="flex flex-col gap-y-2 txt-medium text-ui-fg-subtle">
        <div className="flex items-center justify-between">
          <span>Subtotal (excl. shipping and taxes)</span>
          <span data-testid="cart-subtotal" data-value={item_subtotal || 0}>
            {convertToLocale({ amount: item_subtotal ?? 0, currency_code })}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Shipping</span>
          <span data-testid="cart-shipping" data-value={shipping_subtotal || 0}>
            {convertToLocale({ amount: shipping_subtotal ?? 0, currency_code })}
          </span>
        </div>
        {!!discount_subtotal && (
          <div className="flex items-center justify-between">
            <span>Discount</span>
            <span
              className="text-ui-fg-interactive"
              data-testid="cart-discount"
              data-value={discount_subtotal || 0}
            >
              -{" "}
              {convertToLocale({
                amount: discount_subtotal ?? 0,
                currency_code,
              })}
            </span>
          </div>
        )}
        <div className="flex justify-between">
          <span
            className="flex gap-x-1 items-center"
            data-testid="vat-label"
          >
            {vatLabel}
          </span>
          <span data-testid="cart-taxes" data-value={tax_total || 0}>
            {convertToLocale({ amount: tax_total ?? 0, currency_code })}
          </span>
        </div>
      </div>
      <div className="h-px w-full border-b border-gray-200 my-4" />
      <div className="flex items-center justify-between text-ui-fg-base mb-2 txt-medium">
        <span>Total</span>
        <span
          className="txt-xlarge-plus"
          data-testid="cart-total"
          data-value={total || 0}
        >
          {convertToLocale({ amount: total ?? 0, currency_code })}
        </span>
      </div>
      <div className="h-px w-full border-b border-gray-200 mt-4" />
    </div>
  )
}

export default CheckoutCartTotals
