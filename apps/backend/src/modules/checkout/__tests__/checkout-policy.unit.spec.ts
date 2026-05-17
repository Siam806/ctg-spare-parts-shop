const { buildCheckoutAvailability, splitShippingAddressName, toOrderShippingAddress, buildOrderVATBreakdown } = require("../checkout-policy")

describe("checkout policy helpers", () => {
  it("splits shipping names into first and last name", () => {
    expect(splitShippingAddressName("Ada Lovelace")).toEqual({
      firstName: "Ada",
      lastName: "Lovelace",
    })

    expect(splitShippingAddressName("Prince")).toEqual({
      firstName: "Prince",
      lastName: "",
    })
  })

  it("normalizes shipping addresses for order creation", () => {
    expect(
      toOrderShippingAddress({
        name: "Grace Hopper",
        company_name: "Fleet",
        address_1: "Dock 1",
        city: "Amsterdam",
        postal_code: "1000AA",
        country_code: "NL",
      })
    ).toEqual({
      first_name: "Grace",
      last_name: "Hopper",
      company_name: "Fleet",
      address_1: "Dock 1",
      address_2: "",
      city: "Amsterdam",
      postal_code: "1000AA",
      province: "",
      country_code: "NL",
      phone: "",
    })
  })

  it("detects split shipments and item warnings", () => {
    const result = buildCheckoutAvailability(
      [
        {
          id: "item-1",
          title: "In stock",
          quantity: 1,
          variant: {
            manage_inventory: true,
            inventory_quantity: 10,
          },
        },
        {
          id: "item-2",
          title: "Backorder",
          quantity: 2,
          variant: {
            manage_inventory: true,
            allow_backorder: true,
            inventory_quantity: 0,
          },
        },
        {
          id: "item-3",
          title: "Special order",
          quantity: 1,
          variant: {
            manage_inventory: true,
            inventory_quantity: 0,
            metadata: { special_order: true },
          },
        },
      ],
      Date.UTC(2026, 0, 1)
    )

    expect(result.hasSplitShipment).toBe(true)
    expect(result.items).toHaveLength(3)
    expect(result.warnings).toContain("Your order will be shipped in multiple deliveries due to different item availability dates")
    expect(result.warnings).toContain("Backorder: Available on backorder (approx. 7 days)")
    expect(result.warnings).toContain("Special order: Special order item (approx. 21 days)")
  })

  describe("buildOrderSplitShipment", () => {
    it("wraps buildCheckoutAvailability with the CheckoutOutput-compatible shape", () => {
      const { buildOrderSplitShipment } = require("../checkout-policy")

      // backorder (7 days) + special_order (21 days) → two different non-null dates → split shipment
      const result = buildOrderSplitShipment([
        { id: "i1", title: "Pump B",   quantity: 1, variant: { manage_inventory: true, allow_backorder: true, inventory_quantity: 0 } },
        { id: "i2", title: "Sensor A", quantity: 1, variant: { manage_inventory: true, inventory_quantity: 0, metadata: { special_order: true } } },
      ])

      expect(result.hasSplitShipment).toBe(true)
      expect(result.messages).toContain(
        "Your order will be shipped in multiple deliveries due to different item availability dates"
      )
    })

    it("returns hasSplitShipment false when all items are in stock", () => {
      const { buildOrderSplitShipment } = require("../checkout-policy")

      const result = buildOrderSplitShipment([
        { id: "i1", title: "Part A", quantity: 2, variant: { manage_inventory: true, inventory_quantity: 10 } },
        { id: "i2", title: "Part B", quantity: 1, variant: { manage_inventory: true, inventory_quantity: 3 } },
      ])

      expect(result.hasSplitShipment).toBe(false)
      expect(result.messages).toHaveLength(0)
    })
  })

  describe("buildOrderVATBreakdown", () => {
    it("calculates 21% VAT for NL domestic order", () => {
      const breakdown = buildOrderVATBreakdown({
        cartItems: [
          { unit_price: 5000, quantity: 2 }, // €100
        ],
        shippingCountry: "NL",
        shippingCost: 500, // €5
        isB2B: false,
        hasValidVATNumber: false,
      })

      expect(breakdown.subtotal).toBe(10000)
      expect(breakdown.shippingCost).toBe(500)
      expect(breakdown.vatRate).toBe(21)
      expect(breakdown.vatAmount).toBe(2205)      // 21% of €105
      expect(breakdown.total).toBe(12705)
      expect(breakdown.isReverseCharge).toBe(false)
      expect(breakdown.vatCountry).toBe("NL")
    })

    it("applies reverse charge for EU B2B with valid VAT number", () => {
      const breakdown = buildOrderVATBreakdown({
        cartItems: [
          { unit_price: 10000, quantity: 1 }, // €100
        ],
        shippingCountry: "DE",
        shippingCost: 800,
        isB2B: true,
        hasValidVATNumber: true,
      })

      expect(breakdown.vatRate).toBe(0)
      expect(breakdown.vatAmount).toBe(0)
      expect(breakdown.isReverseCharge).toBe(true)
      expect(breakdown.total).toBe(10800) // subtotal + shipping, no VAT
    })

    it("subtotal is the sum of unit_price × quantity across all items", () => {
      const breakdown = buildOrderVATBreakdown({
        cartItems: [
          { unit_price: 2000, quantity: 3 },  // €60
          { unit_price: 500, quantity: 4 },   // €20
        ],
        shippingCountry: "NL",
        shippingCost: 0,
        isB2B: false,
        hasValidVATNumber: false,
      })

      expect(breakdown.subtotal).toBe(8000) // 6000 + 2000
    })
  })
})