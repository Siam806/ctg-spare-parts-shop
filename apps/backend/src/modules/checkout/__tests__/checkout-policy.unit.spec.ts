const { buildCheckoutAvailability, splitShippingAddressName, toOrderShippingAddress } = require("../checkout-policy")

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
})