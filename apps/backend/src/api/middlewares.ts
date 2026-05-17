import { defineMiddlewares } from "@medusajs/framework/http"
import type {
  MedusaRequest,
  MedusaResponse,
  MedusaNextFunction,
} from "@medusajs/framework/http"
import { COMPANY_ACCOUNT_MODULE } from "../modules/company-account"
import CompanyAccountModuleService from "../modules/company-account/service"

/**
 * Middleware that enforces B2B ordering rules for cart mutation endpoints.
 *
 * Rules:
 *  - Unauthenticated requests are rejected (B2B-only store).
 *  - Authenticated customers must have a registered company.
 *  - The company must be approved.
 *  - The user's role must permit ordering (admin or buyer; not view_only).
 */
async function requireApprovedCompany(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  const customerId = (req as any).auth_context?.actor_id

  if (!customerId) {
    // Unauthenticated — this is a B2B-only store, so block guest ordering
    res.status(401).json({
      message: "You must sign in with an approved B2B account to order.",
      code: "UNAUTHENTICATED",
    })
    return
  }

  const companyAccountService: CompanyAccountModuleService =
    req.scope.resolve(COMPANY_ACCOUNT_MODULE)

  const companyUser =
    await companyAccountService.getCompanyUserByCustomerId(customerId)

  if (!companyUser) {
    // Customer hasn't registered a company yet — block ordering
    res.status(403).json({
      message:
        "You must register and have your company approved before ordering.",
      code: "COMPANY_NOT_REGISTERED",
    })
    return
  }

  const canOrder = await companyAccountService.canCustomerOrder(customerId)
  if (!canOrder) {
    res.status(403).json({
      message:
        "Your company account is pending approval or your role does not permit ordering.",
      code: "COMPANY_NOT_APPROVED",
    })
    return
  }

  next()
}

export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/carts",
      method: "POST",
      middlewares: [requireApprovedCompany],
    },
    {
      matcher: "/store/carts/:id/line-items",
      method: "POST",
      middlewares: [requireApprovedCompany],
    },
    {
      matcher: "/store/carts/:id/complete",
      method: "POST",
      middlewares: [requireApprovedCompany],
    },
  ],
})
