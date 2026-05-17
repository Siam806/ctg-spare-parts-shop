import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { approveCompanyWorkflow } from "../../../../../workflows/approve-company"

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params

  const { result } = await approveCompanyWorkflow(req.scope).run({
    input: { company_id: id },
  })

  res.json({
    company: result.company,
    message: "Company approved successfully",
  })
}
