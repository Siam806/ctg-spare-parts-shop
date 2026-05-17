import { defineMiddlewares } from "@medusajs/framework/http"
import type {
  MedusaRequest,
  MedusaResponse,
  MedusaNextFunction,
} from "@medusajs/framework/http"
import { COMPANY_ACCOUNT_MODULE } from "../modules/company-account"
import CompanyAccountModuleService from "../modules/company-account/service"

/**
 * Middleware that blocks unapproved B2B accounts from adding to cart or
 * proceeding to checkout. Only applies to authenticated customers.
 */
async function requireApprovedCompany(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  const customerId = (req as any).auth_context?.actor_id
  if (!customerId) {
    // Not authenticated — let Medusa's own auth middleware handle it
    next()
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
