import { MedusaRequest } from "@medusajs/framework/http"
import { COMPANY_ACCOUNT_MODULE } from "../modules/company-account"
import CompanyAccountModuleService from "../modules/company-account/service"

/**
 * Get the authenticated customer's company context
 */
export async function getAuthCompany(req: MedusaRequest): Promise<any | null> {
  const customerId = (req as any).auth_context?.actor_id
  if (!customerId) {
    return null
  }

  const companyAccountService: CompanyAccountModuleService =
    req.scope.resolve(COMPANY_ACCOUNT_MODULE)

  const companyUser =
    await companyAccountService.getCompanyUserByCustomerId(customerId)

  if (!companyUser) {
    return null
  }

  const company = await companyAccountService.retrieveCompany(
    companyUser.company_id
  )

  return company
}
