import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { COMPANY_ACCOUNT_MODULE } from "../modules/company-account"
import CompanyAccountModuleService from "../modules/company-account/service"
import { Modules } from "@medusajs/framework/utils"

export default async function companyRejectedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const companyAccountService: CompanyAccountModuleService =
    container.resolve(COMPANY_ACCOUNT_MODULE)
  const notificationService = container.resolve(Modules.NOTIFICATION)

  const companyId = data.id
  const company = await companyAccountService.retrieveCompany(companyId)

  // Get the primary contact user
  const companyUsers = await companyAccountService.listCompanyUsers({
    company_id: companyId,
    is_primary_contact: true,
  })

  if (!companyUsers.length) return

  const primaryUser = companyUsers[0]

  // Resolve the customer to get their email
  const customerService = container.resolve(Modules.CUSTOMER)
  const customer = await customerService.retrieveCustomer(primaryUser.customer_id)

  if (!customer?.email) return

  // Send rejection notification
  await notificationService.createNotifications({
    to: customer.email,
    channel: "email",
    template: "company-rejected",
    data: {
      company_name: company.name,
      customer_name: `${customer.first_name} ${customer.last_name}`,
      rejection_reason: company.rejection_reason || "No reason provided.",
    },
  })
}

export const config: SubscriberConfig = {
  event: "company.rejected",
}
