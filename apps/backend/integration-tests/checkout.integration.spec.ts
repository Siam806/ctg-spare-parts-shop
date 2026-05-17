/**
 * Integration tests for Checkout Flow (issue #8)
 *
 * Tests:
 * - Address selection (saved and ad-hoc)
 * - Shipping rates fetching
 * - VAT calculation
 * - Order creation in pending_payment state
 * - Split-shipment detection
 *
 * Run with: pnpm test:integration
 */

import { medusaIntegrationTestRunner } from "medusa-test-utils"

jest.setTimeout(30000)

medusaIntegrationTestRunner({
  testName: "Checkout Flow Integration Tests",
  inApp: true,
  env: {
    // Mock shipping config for tests
    SHIPPING_SENDER_COUNTRY: "DE",
    SHIPPING_SENDER_POSTAL: "10115",
  },
  fn: ({ getContainer }) => {
    describe("Checkout API Integration", () => {
      let container: any
      let customerModuleService: any
      let cartModuleService: any
      let customerAddressService: any
      let companyAccountService: any

      beforeAll(() => {
        container = getContainer()
        customerModuleService = container.resolve("customer")
        cartModuleService = container.resolve("cart")
        customerAddressService = container.resolve("customer_address")
        companyAccountService = container.resolve("company_account")
      })

      describe("GET /store/checkout/addresses", () => {
        it("returns 401 when not authenticated", async () => {
          const response = await fetch("http://localhost:9000/store/checkout/addresses", {
            headers: {
              "Content-Type": "application/json",
            },
          })

          expect(response.status).toBe(401)
        })

        it("returns empty array for customer with no saved addresses", async () => {
          // Create a test customer
          const customer = await customerModuleService.createCustomers({
            email: "test-no-addresses@example.com",
            first_name: "Test",
            last_name: "User",
          })

          // Authenticate and get token
          // Note: In real tests, use proper auth flow
          const authToken = "test-token"

          const response = await fetch("http://localhost:9000/store/checkout/addresses", {
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${authToken}`,
            },
          })

          expect(response.status).toBe(200)
          const data = await response.json()
          expect(data.addresses).toEqual([])
        })
      })

      describe("POST /store/checkout/addresses", () => {
        it("creates a new shipping address", async () => {
          const customer = await customerModuleService.createCustomers({
            email: "test-address@example.com",
            first_name: "Test",
            last_name: "User",
          })

          const authToken = "test-token"

          const response = await fetch("http://localhost:9000/store/checkout/addresses", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${authToken}`,
            },
            body: JSON.stringify({
              name: "John Doe",
              company_name: "Test Company BV",
              address_line_1: "Keizersgracht 123",
              city: "Amsterdam",
              postal_code: "1015 CJ",
              country_code: "NL",
              phone: "+31 20 123 4567",
              is_default_shipping: true,
            }),
          })

          expect(response.status).toBe(201)
          const data = await response.json()
          expect(data.address).toBeDefined()
          expect(data.address.country_code).toBe("NL")
          expect(data.address.is_default_shipping).toBe(true)
        })

        it("returns 400 for invalid address data", async () => {
          const authToken = "test-token"

          const response = await fetch("http://localhost:9000/store/checkout/addresses", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${authToken}`,
            },
            body: JSON.stringify({
              name: "", // Invalid - required
              address_line_1: "Keizersgracht 123",
              city: "Amsterdam",
              // Missing postal_code and country_code
            }),
          })

          expect(response.status).toBe(400)
        })
      })

      describe("POST /store/checkout/shipping-rates", () => {
        it("returns shipping rates for a valid cart and address", async () => {
          // Create a cart with items
          const cart = await cartModuleService.createCarts({
            currency_code: "EUR",
            email: "test@example.com",
            items: [
              {
                variant_id: "variant_123",
                quantity: 2,
                unit_price: 5000,
              },
            ],
          })

          const authToken = "test-token"

          const response = await fetch("http://localhost:9000/store/checkout/shipping-rates", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${authToken}`,
            },
            body: JSON.stringify({
              cartId: cart.id,
              shippingAddress: {
                country_code: "NL",
                postal_code: "1012 AB",
              },
            }),
          })

          expect(response.status).toBe(200)
          const data = await response.json()
          expect(data.rates).toBeDefined()
          expect(Array.isArray(data.rates)).toBe(true)
          expect(data.totalWeight).toBeGreaterThan(0)
        })

        it("returns 400 when cartId is missing", async () => {
          const authToken = "test-token"

          const response = await fetch("http://localhost:9000/store/checkout/shipping-rates", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${authToken}`,
            },
            body: JSON.stringify({
              shippingAddress: {
                country_code: "NL",
                postal_code: "1012 AB",
              },
            }),
          })

          expect(response.status).toBe(400)
        })
      })

      describe("POST /store/checkout/summary", () => {
        it("returns order summary with VAT breakdown", async () => {
          // Create customer with company (B2B)
          const customer = await customerModuleService.createCustomers({
            email: "b2b@example.com",
            first_name: "B2B",
            last_name: "Customer",
            metadata: { is_b2b: true },
          })

          // Create approved company
          const company = await companyAccountService.createCompanies({
            name: "B2B Test Company",
            vat_number: "NL123456789B01",
            billing_address_line_1: "Test Street 1",
            billing_city: "Amsterdam",
            billing_postal_code: "1012 AB",
            billing_country_code: "NL",
            approval_status: "approved",
          })

          await companyAccountService.createCompanyUsers({
            customer_id: customer.id,
            company_id: company.id,
            role: "buyer",
          })

          // Create cart
          const cart = await cartModuleService.createCarts({
            currency_code: "EUR",
            email: customer.email,
            customer_id: customer.id,
            items: [
              {
                variant_id: "variant_123",
                quantity: 2,
                unit_price: 5000, // €50 each
                title: "Test Part",
              },
            ],
          })

          const authToken = "test-token"

          const response = await fetch("http://localhost:9000/store/checkout/summary", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${authToken}`,
            },
            body: JSON.stringify({
              cartId: cart.id,
              shippingCost: 895, // €8.95
              vatNumber: "NL123456789B01",
            }),
          })

          expect(response.status).toBe(200)
          const data = await response.json()

          // Verify pricing breakdown
          expect(data.pricing.subtotal).toBe(10000) // €100.00
          expect(data.pricing.shipping_cost).toBe(895)
          expect(data.pricing.total).toBeGreaterThan(0)
          expect(data.pricing.vat_rate).toBeDefined()

          // Verify items
          expect(data.items).toHaveLength(1)
          expect(data.items[0].title).toBe("Test Part")
        })

        it("detects split shipments for items with different availability", async () => {
          // Create cart with mixed availability items
          const cart = await cartModuleService.createCarts({
            currency_code: "EUR",
            email: "test@example.com",
            items: [
              {
                variant_id: "in_stock_variant",
                quantity: 1,
                unit_price: 5000,
                title: "In Stock Item",
              },
              {
                variant_id: "backorder_variant",
                quantity: 1,
                unit_price: 3000,
                title: "Backorder Item",
              },
            ],
          })

          const authToken = "test-token"

          const response = await fetch("http://localhost:9000/store/checkout/summary", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${authToken}`,
            },
            body: JSON.stringify({
              cartId: cart.id,
              shippingCost: 500,
            }),
          })

          expect(response.status).toBe(200)
          const data = await response.json()
          expect(data.availability.has_split_shipment).toBeDefined()
          expect(Array.isArray(data.availability.warnings)).toBe(true)
        })
      })

      describe("POST /store/checkout/complete", () => {
        it("creates order in pending_payment state for approved company", async () => {
          // Setup: Create approved company with buyer
          const customer = await customerModuleService.createCustomers({
            email: "approved-buyer@example.com",
            first_name: "Approved",
            last_name: "Buyer",
          })

          const company = await companyAccountService.createCompanies({
            name: "Approved Company BV",
            vat_number: "NL987654321B01",
            billing_address_line_1: "Business Street 1",
            billing_city: "Rotterdam",
            billing_postal_code: "3011 AA",
            billing_country_code: "NL",
            approval_status: "approved",
          })

          await companyAccountService.createCompanyUsers({
            customer_id: customer.id,
            company_id: company.id,
            role: "buyer",
          })

          // Create cart
          const cart = await cartModuleService.createCarts({
            currency_code: "EUR",
            email: customer.email,
            customer_id: customer.id,
            items: [
              {
                variant_id: "variant_123",
                quantity: 1,
                unit_price: 7500,
                title: "CTG Sensor",
              },
            ],
          })

          // Create shipping address
          const address = await customerAddressService.createCustomerAddress({
            customer_id: customer.id,
            company_id: company.id,
            name: "John Doe",
            address_line_1: "Delivery Street 1",
            city: "Amsterdam",
            postal_code: "1012 AB",
            country_code: "NL",
          })

          const authToken = "test-token"

          const response = await fetch("http://localhost:9000/store/checkout/complete", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${authToken}`,
            },
            body: JSON.stringify({
              cartId: cart.id,
              shippingAddressId: address.id,
              shippingMethod: {
                carrier: "sendcloud",
                service: "standard",
                price: 695, // €6.95
              },
              poReference: "PO-2024-001",
              vatNumber: "NL987654321B01",
            }),
          })

          expect(response.status).toBe(201)
          const data = await response.json()

          // Verify order creation
          expect(data.order).toBeDefined()
          expect(data.order.id).toBeDefined()
          expect(data.order.status).toBe("pending")
          expect(data.order.payment_status).toBe("pending")
          expect(data.order.fulfillment_status).toBe("not_fulfilled")

          // Verify pricing
          expect(data.summary.subtotal).toBe(7500)
          expect(data.summary.shipping_cost).toBe(695)
          expect(data.summary.total).toBeGreaterThan(0)

          // Verify next steps
          expect(data.next_steps.payment_required).toBe(true)
        })

        it("returns 403 for unapproved company", async () => {
          // Create pending company
          const customer = await customerModuleService.createCustomers({
            email: "pending-buyer@example.com",
            first_name: "Pending",
            last_name: "Buyer",
          })

          const company = await companyAccountService.createCompanies({
            name: "Pending Company BV",
            billing_address_line_1: "Test Street 1",
            billing_city: "Amsterdam",
            billing_postal_code: "1012 AB",
            billing_country_code: "NL",
            approval_status: "pending",
          })

          await companyAccountService.createCompanyUsers({
            customer_id: customer.id,
            company_id: company.id,
            role: "buyer",
          })

          const cart = await cartModuleService.createCarts({
            currency_code: "EUR",
            email: customer.email,
            customer_id: customer.id,
            items: [
              {
                variant_id: "variant_123",
                quantity: 1,
                unit_price: 5000,
              },
            ],
          })

          const authToken = "test-token"

          const response = await fetch("http://localhost:9000/store/checkout/complete", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${authToken}`,
            },
            body: JSON.stringify({
              cartId: cart.id,
              shippingAddress: {
                name: "Test",
                address_1: "Test Street 1",
                city: "Amsterdam",
                postal_code: "1012 AB",
                country_code: "NL",
              },
              shippingMethod: {
                carrier: "sendcloud",
                service: "standard",
                price: 500,
              },
            }),
          })

          expect(response.status).toBe(403)
          const data = await response.json()
          expect(data.code).toBe("COMPANY_NOT_APPROVED")
        })

        it("returns 400 for missing required fields", async () => {
          const authToken = "test-token"

          const response = await fetch("http://localhost:9000/store/checkout/complete", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${authToken}`,
            },
            body: JSON.stringify({
              // Missing cartId, shippingAddress, shippingMethod
            }),
          })

          expect(response.status).toBe(400)
        })
      })
    })
  },
})
