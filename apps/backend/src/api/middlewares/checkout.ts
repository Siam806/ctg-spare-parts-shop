import { defineMiddlewares } from "@medusajs/framework/http"
import type { MedusaRequest, MedusaResponse, MedusaNextFunction } from "@medusajs/framework/http"
import { COMPANY_ACCOUNT_MODULE } from "../../modules/company-account"
import CompanyAccountModuleService from "../../modules/company-account/service"
import { CompanyApprovalStatus } from "../../modules/company-account/models/company"
import { CompanyUserRole } from "../../modules/company-account/models/company-user"

/**
 * Middleware to ensure customer has approved company for checkout
 *
 * SC-01, CA-02, CA-03: Only approved company users with proper roles can checkout
 */
async function requireApprovedCompany(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  const customerId = (req as any).auth_context?.actor_id

  if (!customerId) {
    return res.status(401).json({
      type: "unauthorized",
      message: "Authentication required",
    })
  }

  const companyAccountService: CompanyAccountModuleService = req.scope.resolve(COMPANY_ACCOUNT_MODULE)
  const logger = req.scope.resolve("logger")

  try {
    // Get company user
    const companyUser = await companyAccountService.getCompanyUserByCustomerId(customerId)

    if (!companyUser) {
      logger.warn(`[Checkout Middleware] Customer ${customerId} has no company`)
      return res.status(403).json({
        type: "forbidden",
        message: "Company registration required for checkout",
        code: "COMPANY_NOT_REGISTERED",
      })
    }

    // Get company
    const company = await companyAccountService.retrieveCompany(companyUser.company_id)

    // Check approval status
    if (company.approval_status !== CompanyApprovalStatus.APPROVED) {
      logger.warn(
        `[Checkout Middleware] Customer ${customerId} company not approved: ${company.approval_status}`
      )
      return res.status(403).json({
        type: "forbidden",
        message: "Company must be approved before placing orders",
        code: "COMPANY_NOT_APPROVED",
        details: {
          status: company.approval_status,
        },
      })
    }

    // Check role permissions (only Admin and Buyer can checkout)
    if (companyUser.role === CompanyUserRole.VIEW_ONLY) {
      logger.warn(`[Checkout Middleware] Customer ${customerId} has view-only role`)
      return res.status(403).json({
        type: "forbidden",
        message: "View-only users cannot place orders",
        code: "INSUFFICIENT_PERMISSIONS",
      })
    }

    // Attach company info to request for downstream use
    ;(req as any).company = company
    ;(req as any).companyUser = companyUser

    logger.info(`[Checkout Middleware] Approved checkout for customer ${customerId}`)
    next()
  } catch (error: any) {
    logger.error(`[Checkout Middleware] Error: ${error.message}`)
    return res.status(500).json({
      type: "error",
      message: "Failed to verify company status",
    })
  }
}

/**
 * Checkout middleware configuration
 */
export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/checkout/addresses",
      middlewares: [],
    },
    {
      matcher: "/store/checkout/shipping-rates",
      middlewares: [],
    },
    {
      matcher: "/store/checkout/summary",
      middlewares: [],
    },
    {
      matcher: "/store/checkout/complete",
      middlewares: [requireApprovedCompany],
    },
  ],
})
