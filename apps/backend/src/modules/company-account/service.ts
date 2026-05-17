import { MedusaService } from "@medusajs/framework/utils"
import { Company, CompanyUser } from "./models"
import { CompanyApprovalStatus } from "./models/company"
import { CompanyUserRole } from "./models/company-user"

class CompanyAccountModuleService extends MedusaService({
  Company,
  CompanyUser,
}) {
  async approveCompany(companyId: string) {
    return await this.updateCompanies({
      id: companyId,
      approval_status: CompanyApprovalStatus.APPROVED,
      approved_at: new Date(),
      rejected_at: null,
      rejection_reason: null,
    })
  }

  async rejectCompany(companyId: string, reason?: string) {
    return await this.updateCompanies({
      id: companyId,
      approval_status: CompanyApprovalStatus.REJECTED,
      rejected_at: new Date(),
      rejection_reason: reason || null,
    })
  }

  async isCompanyApproved(companyId: string): Promise<boolean> {
    const company = await this.retrieveCompany(companyId)
    return company.approval_status === CompanyApprovalStatus.APPROVED
  }

  async getCompanyByCustomerId(customerId: string) {
    const [companyUser] = await this.listCompanyUsers({
      customer_id: customerId,
    })
    if (!companyUser) return null
    return await this.retrieveCompany(companyUser.company_id)
  }

  async getCompanyUserByCustomerId(customerId: string) {
    const [companyUser] = await this.listCompanyUsers({
      customer_id: customerId,
    })
    return companyUser || null
  }

  async canCustomerOrder(customerId: string): Promise<boolean> {
    const companyUser = await this.getCompanyUserByCustomerId(customerId)
    if (!companyUser) return false

    const company = await this.retrieveCompany(companyUser.company_id)
    if (company.approval_status !== CompanyApprovalStatus.APPROVED) return false

    // View-only users cannot order
    if (companyUser.role === CompanyUserRole.VIEW_ONLY) return false

    return true
  }
}

export default CompanyAccountModuleService
