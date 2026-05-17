import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { COMPANY_ACCOUNT_MODULE } from "../../../../modules/company-account"
import CompanyAccountModuleService from "../../../../modules/company-account/service"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const companyAccountService: CompanyAccountModuleService =
    req.scope.resolve(COMPANY_ACCOUNT_MODULE)

  const { id } = req.params

  const company = await companyAccountService.retrieveCompany(id)
  const companyUsers = await companyAccountService.listCompanyUsers({
    company_id: id,
  })

  res.json({
    company,
    company_users: companyUsers,
  })
}
