import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { COMPANY_ACCOUNT_MODULE } from "../../../modules/company-account"
import CompanyAccountModuleService from "../../../modules/company-account/service"
import registerB2BCompanyWorkflow from "../../../workflows/register-b2b-company"
import { z } from "zod"

const registerCompanySchema = z.object({
  company_name: z.string().min(1),
  vat_number: z.string().optional(),
  kvk_number: z.string().optional(),
  billing_address_line_1: z.string().min(1),
  billing_address_line_2: z.string().optional(),
  billing_city: z.string().min(1),
  billing_postal_code: z.string().min(1),
  billing_province: z.string().optional(),
  billing_country_code: z.string().length(2),
  phone: z.string().optional(),
  website: z.string().url().optional(),
})

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const customerId = (req as any).auth_context?.actor_id
  if (!customerId) {
    res.status(401).json({ message: "Authentication required" })
    return
  }

  const parsed = registerCompanySchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      message: "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    })
    return
  }

  // Check if customer already belongs to a company
  const companyAccountService: CompanyAccountModuleService =
    req.scope.resolve(COMPANY_ACCOUNT_MODULE)

  const existingCompany =
    await companyAccountService.getCompanyByCustomerId(customerId)
  if (existingCompany) {
    res.status(409).json({
      message: "Customer already belongs to a company",
      company_id: existingCompany.id,
    })
    return
  }

  const { result } = await registerB2BCompanyWorkflow(req.scope).run({
    input: {
      ...parsed.data,
      customer_id: customerId,
    },
  })

  res.status(201).json({
    company: result.company,
    company_user: result.company_user,
  })
}
