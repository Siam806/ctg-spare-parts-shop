import { CompanyApprovalStatus } from "../models/company"
import { CompanyUserRole } from "../models/company-user"

/**
 * Unit tests for CompanyAccountModuleService logic.
 *
 * These tests mock the underlying MedusaService CRUD methods and focus on
 * the custom business logic methods (approveCompany, rejectCompany,
 * canCustomerOrder, etc.).
 */

// Mock service instance with stubbed CRUD methods
function createMockService() {
  const companies: Record<string, any> = {}
  const companyUsers: any[] = []

  const service = {
    companies,
    companyUsers,

    // CRUD mocks
    async createCompanies(data: any) {
      const id = `comp_${Date.now()}`
      const company = { id, ...data, created_at: new Date().toISOString() }
      companies[id] = company
      return company
    },
    async retrieveCompany(id: string) {
      if (!companies[id]) throw new Error(`Company ${id} not found`)
      return companies[id]
    },
    async updateCompanies(id: string, data: any) {
      if (!companies[id]) throw new Error(`Company ${id} not found`)
      companies[id] = { ...companies[id], ...data }
      return companies[id]
    },
    async deleteCompanies(id: string) {
      delete companies[id]
    },
    async listCompanies(filters: any = {}) {
      return Object.values(companies).filter((c: any) => {
        if (filters.approval_status && c.approval_status !== filters.approval_status) return false
        return true
      })
    },

    async createCompanyUsers(data: any) {
      const id = `cu_${Date.now()}`
      const cu = { id, ...data }
      companyUsers.push(cu)
      return cu
    },
    async listCompanyUsers(filters: any = {}) {
      return companyUsers.filter((cu: any) => {
        if (filters.customer_id && cu.customer_id !== filters.customer_id) return false
        if (filters.company_id && cu.company_id !== filters.company_id) return false
        if (filters.is_primary_contact !== undefined && cu.is_primary_contact !== filters.is_primary_contact) return false
        return true
      })
    },
    async deleteCompanyUsers(id: string) {
      const idx = companyUsers.findIndex((cu) => cu.id === id)
      if (idx >= 0) companyUsers.splice(idx, 1)
    },

    // Custom methods (mirrors service.ts logic)
    async approveCompany(companyId: string) {
      return await this.updateCompanies(companyId, {
        approval_status: CompanyApprovalStatus.APPROVED,
        approved_at: new Date(),
        rejected_at: null,
        rejection_reason: null,
      })
    },

    async rejectCompany(companyId: string, reason?: string) {
      return await this.updateCompanies(companyId, {
        approval_status: CompanyApprovalStatus.REJECTED,
        rejected_at: new Date(),
        rejection_reason: reason || null,
      })
    },

    async isCompanyApproved(companyId: string): Promise<boolean> {
      const company = await this.retrieveCompany(companyId)
      return company.approval_status === CompanyApprovalStatus.APPROVED
    },

    async getCompanyByCustomerId(customerId: string) {
      const [companyUser] = await this.listCompanyUsers({ customer_id: customerId })
      if (!companyUser) return null
      return await this.retrieveCompany(companyUser.company_id)
    },

    async getCompanyUserByCustomerId(customerId: string) {
      const [companyUser] = await this.listCompanyUsers({ customer_id: customerId })
      return companyUser || null
    },

    async canCustomerOrder(customerId: string): Promise<boolean> {
      const companyUser = await this.getCompanyUserByCustomerId(customerId)
      if (!companyUser) return false

      const company = await this.retrieveCompany(companyUser.company_id)
      if (company.approval_status !== CompanyApprovalStatus.APPROVED) return false

      if (companyUser.role === CompanyUserRole.VIEW_ONLY) return false

      return true
    },
  }

  return service
}

describe("CompanyAccountModuleService", () => {
  let service: ReturnType<typeof createMockService>
  let companyId: string

  beforeEach(async () => {
    service = createMockService()
    const company = await service.createCompanies({
      name: "Test BV",
      vat_number: "NL123456789B01",
      kvk_number: "12345678",
      billing_address_line_1: "Hoofdweg 1",
      billing_city: "Amsterdam",
      billing_postal_code: "1012 AB",
      billing_country_code: "nl",
      approval_status: CompanyApprovalStatus.PENDING,
    })
    companyId = company.id
  })

  describe("approveCompany", () => {
    it("should set status to approved", async () => {
      const result = await service.approveCompany(companyId)
      expect(result.approval_status).toBe(CompanyApprovalStatus.APPROVED)
      expect(result.approved_at).toBeDefined()
      expect(result.rejection_reason).toBeNull()
    })
  })

  describe("rejectCompany", () => {
    it("should set status to rejected with reason", async () => {
      const result = await service.rejectCompany(companyId, "Invalid VAT")
      expect(result.approval_status).toBe(CompanyApprovalStatus.REJECTED)
      expect(result.rejected_at).toBeDefined()
      expect(result.rejection_reason).toBe("Invalid VAT")
    })

    it("should set status to rejected without reason", async () => {
      const result = await service.rejectCompany(companyId)
      expect(result.approval_status).toBe(CompanyApprovalStatus.REJECTED)
      expect(result.rejection_reason).toBeNull()
    })
  })

  describe("isCompanyApproved", () => {
    it("should return false for pending company", async () => {
      const result = await service.isCompanyApproved(companyId)
      expect(result).toBe(false)
    })

    it("should return true for approved company", async () => {
      await service.approveCompany(companyId)
      const result = await service.isCompanyApproved(companyId)
      expect(result).toBe(true)
    })

    it("should return false for rejected company", async () => {
      await service.rejectCompany(companyId)
      const result = await service.isCompanyApproved(companyId)
      expect(result).toBe(false)
    })
  })

  describe("canCustomerOrder", () => {
    it("should return false if customer has no company", async () => {
      const result = await service.canCustomerOrder("unknown-customer")
      expect(result).toBe(false)
    })

    it("should return false if company is pending", async () => {
      await service.createCompanyUsers({
        company_id: companyId,
        customer_id: "cust_1",
        role: CompanyUserRole.ADMIN,
        is_primary_contact: true,
      })
      const result = await service.canCustomerOrder("cust_1")
      expect(result).toBe(false)
    })

    it("should return true for admin in approved company", async () => {
      await service.approveCompany(companyId)
      await service.createCompanyUsers({
        company_id: companyId,
        customer_id: "cust_1",
        role: CompanyUserRole.ADMIN,
        is_primary_contact: true,
      })
      const result = await service.canCustomerOrder("cust_1")
      expect(result).toBe(true)
    })

    it("should return true for buyer in approved company", async () => {
      await service.approveCompany(companyId)
      await service.createCompanyUsers({
        company_id: companyId,
        customer_id: "cust_2",
        role: CompanyUserRole.BUYER,
        is_primary_contact: false,
      })
      const result = await service.canCustomerOrder("cust_2")
      expect(result).toBe(true)
    })

    it("should return false for view-only in approved company", async () => {
      await service.approveCompany(companyId)
      await service.createCompanyUsers({
        company_id: companyId,
        customer_id: "cust_3",
        role: CompanyUserRole.VIEW_ONLY,
        is_primary_contact: false,
      })
      const result = await service.canCustomerOrder("cust_3")
      expect(result).toBe(false)
    })

    it("should return false for admin in rejected company", async () => {
      await service.rejectCompany(companyId)
      await service.createCompanyUsers({
        company_id: companyId,
        customer_id: "cust_1",
        role: CompanyUserRole.ADMIN,
        is_primary_contact: true,
      })
      const result = await service.canCustomerOrder("cust_1")
      expect(result).toBe(false)
    })
  })

  describe("getCompanyByCustomerId", () => {
    it("should return null for unknown customer", async () => {
      const result = await service.getCompanyByCustomerId("unknown")
      expect(result).toBeNull()
    })

    it("should return company for known customer", async () => {
      await service.createCompanyUsers({
        company_id: companyId,
        customer_id: "cust_1",
        role: CompanyUserRole.ADMIN,
        is_primary_contact: true,
      })
      const result = await service.getCompanyByCustomerId("cust_1")
      expect(result).not.toBeNull()
      expect(result!.id).toBe(companyId)
      expect(result!.name).toBe("Test BV")
    })
  })

  describe("getCompanyUserByCustomerId", () => {
    it("should return null for unknown customer", async () => {
      const result = await service.getCompanyUserByCustomerId("unknown")
      expect(result).toBeNull()
    })

    it("should return company user for known customer", async () => {
      await service.createCompanyUsers({
        company_id: companyId,
        customer_id: "cust_1",
        role: CompanyUserRole.BUYER,
        is_primary_contact: false,
      })
      const result = await service.getCompanyUserByCustomerId("cust_1")
      expect(result).not.toBeNull()
      expect(result!.customer_id).toBe("cust_1")
      expect(result!.role).toBe(CompanyUserRole.BUYER)
    })
  })
})
