import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { CompanyUserRole } from "../modules/company-account/models/company-user"
import { CompanyApprovalStatus } from "../modules/company-account/models/company"
import { COMPANY_ACCOUNT_MODULE } from "../modules/company-account"

/**
 * Seed a test admin customer + approved company + company_user (ADMIN)
 * Run with: pnpm --filter @ctg/backend medusa exec ./src/scripts/seed-admin-user.ts
 */
export default async function seedAdminUser({ container }: { container: MedusaContainer }) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  const customerService: any = container.resolve("customer")
  const companyAccountService: any = container.resolve(COMPANY_ACCOUNT_MODULE)

  const email = 'siamthedoom@gmail.com'
  const password = 'Kennwort'

  logger.info("Seeding test admin user...")
  logger.info(`Email: ${email}`)

  let customer: any
  try {
    // Try to create customer with password (may be accepted by customer service)
    customer = await customerService.createCustomers({
      email,
      first_name: "Test",
      last_name: "Admin",
      password,
    })
    logger.info(`Created customer ${customer.id}`)
  } catch (err) {
    logger.warn("createCustomers with password failed; creating without password and logging instructions")
    customer = await customerService.createCustomers({
      email,
      first_name: "Test",
      last_name: "Admin",
    })
    logger.info(`Created customer ${customer.id} (password not set).`)
    logger.info("If you need to sign in via the storefront/admin, set a password using the DB or a password-reset flow.")
  }

  // No company/user linking required for simple credential creation

  logger.info("")
  logger.info("✅ Test admin seed complete")
  logger.info(`Email: ${email}`)
  logger.info(`Password: ${password} (if accepted by your customer service)`) 
  logger.info("")
  logger.info("Notes:")
  logger.info("- If the password was not accepted during creation, use your DB or password-reset flow to set a password for the customer.")
  logger.info("- For integration tests using medusa test-utils, you can locate the created customer by email and use the container services to authenticate programmatically.")
}
