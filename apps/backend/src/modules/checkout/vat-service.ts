/**
 * VAT Calculation Service
 *
 * Handles VAT calculations for:
 * - Domestic Netherlands transactions (21% VAT)
 * - EU B2B reverse charge (0% VAT, buyer accounts for VAT)
 * - Other EU countries (rate depends on destination)
 *
 * PM-03: VAT must be handled correctly for intra-EU B2B (reverse charge) and domestic
 */

// Standard Dutch VAT rate
const NL_VAT_RATE = 21

// EU member states (ISO 3166-1 alpha-2)
const EU_COUNTRIES = [
  "AT", // Austria
  "BE", // Belgium
  "BG", // Bulgaria
  "HR", // Croatia
  "CY", // Cyprus
  "CZ", // Czech Republic
  "DK", // Denmark
  "EE", // Estonia
  "FI", // Finland
  "FR", // France
  "DE", // Germany
  "GR", // Greece
  "HU", // Hungary
  "IE", // Ireland
  "IT", // Italy
  "LV", // Latvia
  "LT", // Lithuania
  "LU", // Luxembourg
  "MT", // Malta
  "NL", // Netherlands
  "PL", // Poland
  "PT", // Portugal
  "RO", // Romania
  "SK", // Slovakia
  "SI", // Slovenia
  "ES", // Spain
  "SE", // Sweden
]

// Standard VAT rates by country (simplified - only standard rates)
const VAT_RATES: Record<string, number> = {
  AT: 20,
  BE: 21,
  BG: 20,
  HR: 25,
  CY: 19,
  CZ: 21,
  DK: 25,
  EE: 22,
  FI: 25.5,
  FR: 20,
  DE: 19,
  GR: 24,
  HU: 27,
  IE: 23,
  IT: 22,
  LV: 21,
  LT: 21,
  LU: 17,
  MT: 18,
  NL: 21,
  PL: 23,
  PT: 23,
  RO: 19,
  SK: 20,
  SI: 22,
  ES: 21,
  SE: 25,
}

export interface VATBreakdown {
  subtotal: number // in cents, before VAT
  shippingCost: number // in cents, before VAT
  vatAmount: number // in cents
  vatRate: number // percentage (0 for reverse charge)
  total: number // in cents, after VAT
  isReverseCharge: boolean
  vatCountry: string
}

export interface VATCalculationInput {
  subtotal: number // in cents
  shippingCost: number // in cents
  shippingCountry: string // ISO 3166-1 alpha-2
  customerCountry: string // ISO 3166-1 alpha-2 (billing)
  hasValidVATNumber: boolean
  isB2B: boolean
}

/**
 * Calculate VAT for an order
 *
 * Rules:
 * 1. Domestic NL → always charge 21% VAT
 * 2. EU B2B with valid VAT → reverse charge (0%)
 * 3. EU B2C or B2B without VAT → charge destination country rate
 * 4. Non-EU → export (0% VAT, customs duties may apply)
 */
export function calculateVAT(input: VATCalculationInput): VATBreakdown {
  const { subtotal, shippingCost, shippingCountry, customerCountry, hasValidVATNumber, isB2B } = input

  const isShippingInEU = EU_COUNTRIES.includes(shippingCountry.toUpperCase())
  const isCustomerInEU = EU_COUNTRIES.includes(customerCountry.toUpperCase())

  // Default: no VAT for exports outside EU
  if (!isShippingInEU && !isCustomerInEU) {
    return {
      subtotal,
      shippingCost,
      vatAmount: 0,
      vatRate: 0,
      total: subtotal + shippingCost,
      isReverseCharge: false,
      vatCountry: shippingCountry.toUpperCase(),
    }
  }

  // Domestic transaction (Netherlands)
  if (customerCountry.toUpperCase() === "NL") {
    const vatRate = NL_VAT_RATE
    const vatAmount = Math.round((subtotal + shippingCost) * (vatRate / 100))
    return {
      subtotal,
      shippingCost,
      vatAmount,
      vatRate,
      total: subtotal + shippingCost + vatAmount,
      isReverseCharge: false,
      vatCountry: "NL",
    }
  }

  // EU B2B with valid VAT number → reverse charge
  if (isB2B && hasValidVATNumber && isCustomerInEU) {
    return {
      subtotal,
      shippingCost,
      vatAmount: 0,
      vatRate: 0,
      total: subtotal + shippingCost,
      isReverseCharge: true,
      vatCountry: customerCountry.toUpperCase(),
    }
  }

  // EU B2C or B2B without valid VAT → charge destination VAT
  const destinationCountry = shippingCountry.toUpperCase()
  const vatRate = VAT_RATES[destinationCountry] || 0
  const vatAmount = Math.round((subtotal + shippingCost) * (vatRate / 100))

  return {
    subtotal,
    shippingCost,
    vatAmount,
    vatRate,
    total: subtotal + shippingCost + vatAmount,
    isReverseCharge: false,
    vatCountry: destinationCountry,
  }
}

/**
 * Format VAT number for validation
 * Removes country code prefix and spaces
 */
export function normalizeVATNumber(vatNumber: string): string {
  return vatNumber.replace(/\s/g, "").toUpperCase()
}

/**
 * Basic VAT number format validation
 * Full validation requires VIES API call
 */
export function isValidVATFormat(vatNumber: string): boolean {
  const normalized = normalizeVATNumber(vatNumber)

  // EU VAT numbers start with 2-letter country code followed by 2-12 digits/letters
  const euPattern = /^[A-Z]{2}[A-Z0-9]{2,12}$/

  if (!euPattern.test(normalized)) {
    return false
  }

  // Country-specific patterns (simplified)
  const patterns: Record<string, RegExp> = {
    NL: /^NL[0-9]{9}B[0-9]{2}$/, // NL123456789B01
    DE: /^DE[0-9]{9}$/, // DE123456789
    BE: /^BE[0-9]{10}$/, // BE0123456789
    FR: /^FR[A-Z0-9]{2}[0-9]{9}$/, // FRXX123456789
  }

  const countryCode = normalized.substring(0, 2)
  const pattern = patterns[countryCode]

  if (pattern) {
    return pattern.test(normalized)
  }

  // For other countries, basic format check passed
  return true
}

/**
 * Get VAT label for display
 */
export function getVATLabel(breakdown: VATBreakdown): string {
  if (breakdown.isReverseCharge) {
    return `VAT reverse charge (0%) - ${breakdown.vatCountry}`
  }
  if (breakdown.vatRate === 0) {
    return "VAT exempt (export)"
  }
  return `VAT ${breakdown.vatRate}% (${breakdown.vatCountry})`
}
