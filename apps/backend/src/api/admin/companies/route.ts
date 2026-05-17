import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { COMPANY_ACCOUNT_MODULE } from "../../../modules/company-account"
import CompanyAccountModuleService from "../../../modules/company-account/service"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const companyAccountService: CompanyAccountModuleService =
    req.scope.resolve(COMPANY_ACCOUNT_MODULE)

  const { approval_status, limit, offset } = req.query as {
    approval_status?: string
    limit?: string
    offset?: string
  }

  const filters: Record<string, any> = {}
  if (approval_status) {
    filters.approval_status = approval_status
  }

  const companies = await companyAccountService.listCompanies(filters, {
    take: Number(limit) || 20,
    skip: Number(offset) || 0,
  })

  const count = await companyAccountService.listCompanies(filters)

  res.json({
    companies,
    count: count.length,
    limit: Number(limit) || 20,
    offset: Number(offset) || 0,
  })
}
