import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { rejectCompanyWorkflow } from "../../../../../workflows/approve-company"
import { z } from "zod"

const rejectSchema = z.object({
  reason: z.string().optional(),
})

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params

  const parsed = rejectSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid request body" })
    return
  }

  const { result } = await rejectCompanyWorkflow(req.scope).run({
    input: {
      company_id: id,
      reason: parsed.data.reason,
    },
  })

  res.json({
    company: result.company,
    message: "Company rejected",
  })
}
