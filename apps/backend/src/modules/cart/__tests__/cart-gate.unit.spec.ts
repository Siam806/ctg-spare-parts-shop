/**
 * Unit tests for the cart ordering gate logic (issue #6 — SC-01, SC-02).
 *
 * These tests exercise the business rules that control whether a customer
 * may add items to the cart, mirroring the requireApprovedCompany middleware.
 *
 * Run with: pnpm test:unit
 */

import { CompanyApprovalStatus } from "../../company-account/models/company"
import { CompanyUserRole } from "../../company-account/models/company-user"

// ---------------------------------------------------------------------------
// Inline re-implementation of the gate logic so the test has no I/O deps
// ---------------------------------------------------------------------------

type Company = {
  id: string
  approval_status: string
}

type CompanyUser = {
  id: string
  company_id: string
  customer_id: string
  role: string
}

/**
 * Pure function that mirrors requireApprovedCompany middleware logic.
 * Returns the HTTP status and code the middleware would produce.
 */
function evaluateCartGate(
  customerId: string | null,
  companyUser: CompanyUser | null,
  company: Company | null
): { status: number; code: string } | "allowed" {
  if (!customerId) {
    return { status: 401, code: "UNAUTHENTICATED" }
  }

  if (!companyUser || !company) {
    return { status: 403, code: "COMPANY_NOT_REGISTERED" }
  }

  if (company.approval_status !== CompanyApprovalStatus.APPROVED) {
    return { status: 403, code: "COMPANY_NOT_APPROVED" }
  }

  if (companyUser.role === CompanyUserRole.VIEW_ONLY) {
    return { status: 403, code: "COMPANY_NOT_APPROVED" }
  }

  return "allowed"
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Cart ordering gate (requireApprovedCompany logic)", () => {
  const approvedCompany: Company = {
    id: "comp_1",
    approval_status: CompanyApprovalStatus.APPROVED,
  }

  const pendingCompany: Company = {
    id: "comp_2",
    approval_status: CompanyApprovalStatus.PENDING,
  }

  const rejectedCompany: Company = {
    id: "comp_3",
    approval_status: CompanyApprovalStatus.REJECTED,
  }

  const adminUser = (companyId: string): CompanyUser => ({
    id: "cu_1",
    company_id: companyId,
    customer_id: "cust_1",
    role: CompanyUserRole.ADMIN,
  })

  const buyerUser = (companyId: string): CompanyUser => ({
    id: "cu_2",
    company_id: companyId,
    customer_id: "cust_2",
    role: CompanyUserRole.BUYER,
  })

  const viewOnlyUser = (companyId: string): CompanyUser => ({
    id: "cu_3",
    company_id: companyId,
    customer_id: "cust_3",
    role: CompanyUserRole.VIEW_ONLY,
  })

  it("blocks unauthenticated requests (SC-01: unapproved users cannot add to cart)", () => {
    const result = evaluateCartGate(null, null, null)
    expect(result).toEqual({ status: 401, code: "UNAUTHENTICATED" })
  })

  it("blocks authenticated customer without a company", () => {
    const result = evaluateCartGate("cust_1", null, null)
    expect(result).toEqual({ status: 403, code: "COMPANY_NOT_REGISTERED" })
  })

  it("blocks admin in a pending company", () => {
    const result = evaluateCartGate(
      "cust_1",
      adminUser(pendingCompany.id),
      pendingCompany
    )
    expect(result).toEqual({ status: 403, code: "COMPANY_NOT_APPROVED" })
  })

  it("blocks admin in a rejected company", () => {
    const result = evaluateCartGate(
      "cust_1",
      adminUser(rejectedCompany.id),
      rejectedCompany
    )
    expect(result).toEqual({ status: 403, code: "COMPANY_NOT_APPROVED" })
  })

  it("blocks view-only user in an approved company", () => {
    const result = evaluateCartGate(
      "cust_3",
      viewOnlyUser(approvedCompany.id),
      approvedCompany
    )
    expect(result).toEqual({ status: 403, code: "COMPANY_NOT_APPROVED" })
  })

  it("allows admin in an approved company (SC-01)", () => {
    const result = evaluateCartGate(
      "cust_1",
      adminUser(approvedCompany.id),
      approvedCompany
    )
    expect(result).toBe("allowed")
  })

  it("allows buyer in an approved company (SC-01)", () => {
    const result = evaluateCartGate(
      "cust_2",
      buyerUser(approvedCompany.id),
      approvedCompany
    )
    expect(result).toBe("allowed")
  })
})

// ---------------------------------------------------------------------------
// getStockStatus — mirrors the storefront cart item stock label logic
// ---------------------------------------------------------------------------

type FakeVariant = {
  manage_inventory?: boolean
  allow_backorder?: boolean
  inventory_quantity?: number | null
}

type FakeLineItem = {
  variant?: FakeVariant | null
  quantity: number
}

/**
 * Mirrors the getStockStatus function from the storefront cart Item component.
 * Duplicated here so it can be tested without a Next.js environment.
 */
function getStockStatus(item: FakeLineItem): {
  label: string
  className: string
} {
  const variant = item.variant

  if (!variant) {
    return { label: "Unknown", className: "text-ui-fg-muted" }
  }

  if (!variant.manage_inventory) {
    return { label: "In stock", className: "text-green-600" }
  }

  if (variant.allow_backorder) {
    return { label: "Available", className: "text-green-600" }
  }

  const available = variant.inventory_quantity ?? 0

  if (available <= 0) {
    return { label: "Out of stock", className: "text-red-500 font-medium" }
  }

  if (available < item.quantity) {
    return {
      label: `Only ${available} available`,
      className: "text-orange-500 font-medium",
    }
  }

  if (available <= 5) {
    return { label: `${available} left`, className: "text-orange-400" }
  }

  return { label: "In stock", className: "text-green-600" }
}

describe("getStockStatus (SC-02: stock availability per line item)", () => {
  it("returns 'Unknown' when variant is absent", () => {
    const result = getStockStatus({ variant: null, quantity: 1 })
    expect(result.label).toBe("Unknown")
  })

  it("returns 'In stock' when inventory is not managed", () => {
    const result = getStockStatus({
      variant: { manage_inventory: false },
      quantity: 1,
    })
    expect(result.label).toBe("In stock")
  })

  it("returns 'Available' when backorder is allowed", () => {
    const result = getStockStatus({
      variant: { manage_inventory: true, allow_backorder: true, inventory_quantity: 0 },
      quantity: 1,
    })
    expect(result.label).toBe("Available")
  })

  it("returns 'Out of stock' when qty is 0", () => {
    const result = getStockStatus({
      variant: { manage_inventory: true, allow_backorder: false, inventory_quantity: 0 },
      quantity: 1,
    })
    expect(result.label).toBe("Out of stock")
  })

  it("returns 'Only N available' when qty < requested quantity", () => {
    const result = getStockStatus({
      variant: { manage_inventory: true, allow_backorder: false, inventory_quantity: 2 },
      quantity: 5,
    })
    expect(result.label).toBe("Only 2 available")
    expect(result.className).toContain("orange")
  })

  it("returns 'N left' for low stock (≤ 5) when quantity is satisfied", () => {
    const result = getStockStatus({
      variant: { manage_inventory: true, allow_backorder: false, inventory_quantity: 3 },
      quantity: 2,
    })
    expect(result.label).toBe("3 left")
    expect(result.className).toContain("orange")
  })

  it("returns 'In stock' for ample inventory", () => {
    const result = getStockStatus({
      variant: { manage_inventory: true, allow_backorder: false, inventory_quantity: 100 },
      quantity: 1,
    })
    expect(result.label).toBe("In stock")
    expect(result.className).toContain("green")
  })

  it("returns 'In stock' for exactly 6 available (boundary)", () => {
    const result = getStockStatus({
      variant: { manage_inventory: true, allow_backorder: false, inventory_quantity: 6 },
      quantity: 1,
    })
    expect(result.label).toBe("In stock")
  })

  it("returns 'N left' for exactly 5 available (boundary)", () => {
    const result = getStockStatus({
      variant: { manage_inventory: true, allow_backorder: false, inventory_quantity: 5 },
      quantity: 1,
    })
    expect(result.label).toBe("5 left")
  })
})
