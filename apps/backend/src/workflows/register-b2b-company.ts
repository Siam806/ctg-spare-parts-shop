import {
  createStep,
  createWorkflow,
  WorkflowResponse,
  StepResponse,
} from "@medusajs/framework/workflows-sdk"
import { COMPANY_ACCOUNT_MODULE } from "../modules/company-account"
import CompanyAccountModuleService from "../modules/company-account/service"
import { CompanyUserRole } from "../modules/company-account/models/company-user"

type RegisterB2BCompanyInput = {
  // Company details
  company_name: string
  vat_number?: string
  kvk_number?: string
  billing_address_line_1: string
  billing_address_line_2?: string
  billing_city: string
  billing_postal_code: string
  billing_province?: string
  billing_country_code: string
  phone?: string
  website?: string
  // Primary contact (customer) ID - already created via Medusa auth
  customer_id: string
}

const createCompanyStep = createStep(
  "create-company",
  async (input: RegisterB2BCompanyInput, { container }) => {
    const companyAccountService: CompanyAccountModuleService =
      container.resolve(COMPANY_ACCOUNT_MODULE)

    const company = await companyAccountService.createCompanies({
      name: input.company_name,
      vat_number: input.vat_number || null,
      kvk_number: input.kvk_number || null,
      billing_address_line_1: input.billing_address_line_1,
      billing_address_line_2: input.billing_address_line_2 || null,
      billing_city: input.billing_city,
      billing_postal_code: input.billing_postal_code,
      billing_province: input.billing_province || null,
      billing_country_code: input.billing_country_code,
      phone: input.phone || null,
      website: input.website || null,
    })

    return new StepResponse(company, company.id)
  },
  async (companyId, { container }) => {
    // Compensation: delete the created company
    if (!companyId) return
    const companyAccountService: CompanyAccountModuleService =
      container.resolve(COMPANY_ACCOUNT_MODULE)
    await companyAccountService.deleteCompanies(companyId)
  }
)

const createCompanyUserStep = createStep(
  "create-company-user",
  async (
    input: { company_id: string; customer_id: string },
    { container }
  ) => {
    const companyAccountService: CompanyAccountModuleService =
      container.resolve(COMPANY_ACCOUNT_MODULE)

    const companyUser = await companyAccountService.createCompanyUsers({
      company_id: input.company_id,
      customer_id: input.customer_id,
      role: CompanyUserRole.ADMIN,
      is_primary_contact: true,
    })

    return new StepResponse(companyUser, companyUser.id)
  },
  async (companyUserId, { container }) => {
    // Compensation: delete the created company user
    if (!companyUserId) return
    const companyAccountService: CompanyAccountModuleService =
      container.resolve(COMPANY_ACCOUNT_MODULE)
    await companyAccountService.deleteCompanyUsers(companyUserId)
  }
)

const registerB2BCompanyWorkflow = createWorkflow(
  "register-b2b-company",
  (input: RegisterB2BCompanyInput) => {
    const company = createCompanyStep(input)

    const companyUser = createCompanyUserStep({
      company_id: company.id,
      customer_id: input.customer_id,
    })

    return new WorkflowResponse({
      company,
      company_user: companyUser,
    })
  }
)

export default registerB2BCompanyWorkflow
