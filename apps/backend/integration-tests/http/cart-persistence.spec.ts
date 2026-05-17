/**
 * Integration tests for the persistent shopping cart API contract (issue #6).
 *
 * These tests document the expected API behaviour.
 * Running them requires a database connection (set DATABASE_URL in .env.test).
 * They use Medusa's test-utils to bootstrap the application.
 *
 * Run with: pnpm test:integration:http
 */

import { medusaIntegrationTestRunner } from "@medusajs/test-utils"

medusaIntegrationTestRunner({
  testSuite: ({ api }) => {
    // ------------------------------------------------------------------ //
    // Cart creation gate — B2B only
    // ------------------------------------------------------------------ //

    describe("POST /store/carts — B2B ordering gate (SC-01, SC-02)", () => {
      it("should reject unauthenticated cart creation with 401", async () => {
        const response = await api.post("/store/carts", {
          region_id: "region_test",
        })

        // The requireApprovedCompany middleware now blocks unauthenticated users
        expect(response.status).toBe(401)
        expect(response.data.code).toBe("UNAUTHENTICATED")
      })
    })

    // ------------------------------------------------------------------ //
    // Line-item gate
    // ------------------------------------------------------------------ //

    describe("POST /store/carts/:id/line-items — B2B gate", () => {
      it("should reject unauthenticated line-item addition with 401", async () => {
        const response = await api.post("/store/carts/fake_cart_id/line-items", {
          variant_id: "fake_variant",
          quantity: 1,
        })

        expect(response.status).toBe(401)
        expect(response.data.code).toBe("UNAUTHENTICATED")
      })
    })

    // ------------------------------------------------------------------ //
    // Cart complete gate
    // ------------------------------------------------------------------ //

    describe("POST /store/carts/:id/complete — B2B gate", () => {
      it("should reject unauthenticated cart completion with 401", async () => {
        const response = await api.post("/store/carts/fake_cart_id/complete")

        expect(response.status).toBe(401)
        expect(response.data.code).toBe("UNAUTHENTICATED")
      })
    })

    // ------------------------------------------------------------------ //
    // Cart retrieve — no auth required (read-only)
    // ------------------------------------------------------------------ //

    describe("GET /store/carts/:id — no auth required for read", () => {
      it("should return 404 for a non-existent cart (not 401)", async () => {
        const response = await api.get("/store/carts/nonexistent_cart_id")

        // Reading a cart doesn't require auth — just 404 for missing cart
        expect(response.status).toBe(404)
      })
    })
  },
})
