import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { COMPANY_ACCOUNT_MODULE } from "../../../../modules/company-account"
import CompanyAccountModuleService from "../../../../modules/company-account/service"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const customerId = (req as any).auth_context?.actor_id
  if (!customerId) {
    res.status(401).json({ message: "Authentication required" })
    return
  }

  const companyAccountService: CompanyAccountModuleService =
    req.scope.resolve(COMPANY_ACCOUNT_MODULE)

  const companyUser =
    await companyAccountService.getCompanyUserByCustomerId(customerId)

  if (!companyUser) {
    res.status(404).json({ message: "No company found for this customer" })
    return
  }

  const company = await companyAccountService.retrieveCompany(
    companyUser.company_id
  )

  res.json({
    company,
    company_user: companyUser,
  })
}
