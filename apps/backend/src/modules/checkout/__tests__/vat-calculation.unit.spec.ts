/**
 * Unit tests for VAT calculation service (issue #8 — SC-04, PM-03)
 *
 * Tests VAT calculation for:
 * - Domestic Netherlands (21%)
 * - EU B2B reverse charge (0%)
 * - EU B2C destination VAT
 * - Export outside EU (0%)
 *
 * Run with: pnpm test:unit
 */

import { calculateVAT, isValidVATFormat, normalizeVATNumber, getVATLabel } from "../vat-service"

describe("VAT Calculation (PM-03)", () => {
  describe("Domestic Netherlands transactions", () => {
    it("charges 21% VAT for NL domestic B2B", () => {
      const result = calculateVAT({
        subtotal: 10000, // €100.00
        shippingCost: 500, // €5.00
        shippingCountry: "NL",
        customerCountry: "NL",
        hasValidVATNumber: true,
        isB2B: true,
      })

      expect(result.vatRate).toBe(21)
      expect(result.vatAmount).toBe(2205) // 21% of €105.00 = €22.05
      expect(result.total).toBe(12705) // €127.05
      expect(result.isReverseCharge).toBe(false)
      expect(result.vatCountry).toBe("NL")
    })

    it("charges 21% VAT for NL domestic B2C", () => {
      const result = calculateVAT({
        subtotal: 5000, // €50.00
        shippingCost: 500,
        shippingCountry: "NL",
        customerCountry: "NL",
        hasValidVATNumber: false,
        isB2B: false,
      })

      expect(result.vatRate).toBe(21)
      expect(result.vatAmount).toBe(1155) // 21% of €55.00
      expect(result.total).toBe(6655)
      expect(result.isReverseCharge).toBe(false)
    })
  })

  describe("EU B2B reverse charge", () => {
    it("applies reverse charge (0%) for DE B2B with valid VAT", () => {
      const result = calculateVAT({
        subtotal: 10000,
        shippingCost: 500,
        shippingCountry: "DE",
        customerCountry: "DE",
        hasValidVATNumber: true,
        isB2B: true,
      })

      expect(result.vatRate).toBe(0)
      expect(result.vatAmount).toBe(0)
      expect(result.total).toBe(10500)
      expect(result.isReverseCharge).toBe(true)
      expect(result.vatCountry).toBe("DE")
    })

    it("applies reverse charge for FR B2B with valid VAT", () => {
      const result = calculateVAT({
        subtotal: 20000,
        shippingCost: 1000,
        shippingCountry: "FR",
        customerCountry: "FR",
        hasValidVATNumber: true,
        isB2B: true,
      })

      expect(result.vatRate).toBe(0)
      expect(result.vatAmount).toBe(0)
      expect(result.isReverseCharge).toBe(true)
    })

    it("charges destination VAT for EU B2B without valid VAT number", () => {
      const result = calculateVAT({
        subtotal: 10000,
        shippingCost: 500,
        shippingCountry: "DE",
        customerCountry: "DE",
        hasValidVATNumber: false,
        isB2B: true,
      })

      expect(result.vatRate).toBe(19) // Germany's standard rate
      expect(result.vatAmount).toBe(1995) // 19% of €105.00
      expect(result.isReverseCharge).toBe(false)
    })
  })

  describe("EU B2C transactions", () => {
    it("charges German VAT (19%) for DE B2C", () => {
      const result = calculateVAT({
        subtotal: 10000,
        shippingCost: 500,
        shippingCountry: "DE",
        customerCountry: "DE",
        hasValidVATNumber: false,
        isB2B: false,
      })

      expect(result.vatRate).toBe(19)
      expect(result.vatAmount).toBe(1995)
      expect(result.total).toBe(12495)
      expect(result.isReverseCharge).toBe(false)
    })

    it("charges French VAT (20%) for FR B2C", () => {
      const result = calculateVAT({
        subtotal: 10000,
        shippingCost: 500,
        shippingCountry: "FR",
        customerCountry: "FR",
        hasValidVATNumber: false,
        isB2B: false,
      })

      expect(result.vatRate).toBe(20)
      expect(result.vatAmount).toBe(2100)
      expect(result.total).toBe(12600)
    })
  })

  describe("Export outside EU", () => {
    it("charges 0% VAT for US destination", () => {
      const result = calculateVAT({
        subtotal: 10000,
        shippingCost: 2000,
        shippingCountry: "US",
        customerCountry: "US",
        hasValidVATNumber: false,
        isB2B: true,
      })

      expect(result.vatRate).toBe(0)
      expect(result.vatAmount).toBe(0)
      expect(result.total).toBe(12000)
      expect(result.isReverseCharge).toBe(false)
    })

    it("charges 0% VAT for CH (Switzerland) destination", () => {
      const result = calculateVAT({
        subtotal: 5000,
        shippingCost: 500,
        shippingCountry: "CH",
        customerCountry: "CH",
        hasValidVATNumber: false,
        isB2B: true,
      })

      expect(result.vatRate).toBe(0)
      expect(result.vatAmount).toBe(0)
    })
  })

  describe("Edge cases", () => {
    it("handles zero subtotal and shipping", () => {
      const result = calculateVAT({
        subtotal: 0,
        shippingCost: 0,
        shippingCountry: "NL",
        customerCountry: "NL",
        hasValidVATNumber: false,
        isB2B: false,
      })

      expect(result.vatRate).toBe(21)
      expect(result.vatAmount).toBe(0)
      expect(result.total).toBe(0)
    })

    it("handles fractional cent VAT correctly", () => {
      const result = calculateVAT({
        subtotal: 999, // €9.99
        shippingCost: 99, // €0.99
        shippingCountry: "NL",
        customerCountry: "NL",
        hasValidVATNumber: false,
        isB2B: false,
      })

      // 21% of €10.98 = €2.3058 → rounds to €2.31 (231 cents)
      expect(result.vatAmount).toBe(231)
      expect(result.total).toBe(1329)
    })
  })
})

describe("VAT Number Validation", () => {
  describe("normalizeVATNumber", () => {
    it("removes spaces and converts to uppercase", () => {
      expect(normalizeVATNumber("nl 123456789 b01")).toBe("NL123456789B01")
      expect(normalizeVATNumber("DE 123 456 789")).toBe("DE123456789")
    })
  })

  describe("isValidVATFormat", () => {
    it("accepts valid NL VAT number", () => {
      expect(isValidVATFormat("NL123456789B01")).toBe(true)
    })

    it("accepts valid DE VAT number", () => {
      expect(isValidVATFormat("DE123456789")).toBe(true)
    })

    it("rejects invalid format", () => {
      expect(isValidVATFormat("123456789")).toBe(false) // No country code
      expect(isValidVATFormat("ABC")).toBe(false) // Too short
    })
  })
})

describe("getVATLabel", () => {
  it("returns reverse charge label", () => {
    const breakdown = {
      subtotal: 10000,
      shippingCost: 500,
      vatAmount: 0,
      vatRate: 0,
      total: 10500,
      isReverseCharge: true,
      vatCountry: "DE",
    }
    expect(getVATLabel(breakdown)).toBe("VAT reverse charge (0%) - DE")
  })

  it("returns standard VAT label", () => {
    const breakdown = {
      subtotal: 10000,
      shippingCost: 500,
      vatAmount: 2205,
      vatRate: 21,
      total: 12705,
      isReverseCharge: false,
      vatCountry: "NL",
    }
    expect(getVATLabel(breakdown)).toBe("VAT 21% (NL)")
  })

  it("returns exempt label for zero rate", () => {
    const breakdown = {
      subtotal: 10000,
      shippingCost: 500,
      vatAmount: 0,
      vatRate: 0,
      total: 10500,
      isReverseCharge: false,
      vatCountry: "US",
    }
    expect(getVATLabel(breakdown)).toBe("VAT exempt (export)")
  })
})
