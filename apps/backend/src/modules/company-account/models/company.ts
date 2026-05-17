import { model } from "@medusajs/framework/utils"

export enum CompanyApprovalStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

const Company = model.define("company", {
  id: model.id().primaryKey(),

  // Company identification
  name: model.text(),
  vat_number: model.text().nullable(),
  kvk_number: model.text().nullable(),

  // Billing address
  billing_address_line_1: model.text(),
  billing_address_line_2: model.text().nullable(),
  billing_city: model.text(),
  billing_postal_code: model.text(),
  billing_province: model.text().nullable(),
  billing_country_code: model.text(),

  // Contact info
  phone: model.text().nullable(),
  website: model.text().nullable(),

  // Approval
  approval_status: model.enum(CompanyApprovalStatus).default(CompanyApprovalStatus.PENDING),
  approved_at: model.dateTime().nullable(),
  rejected_at: model.dateTime().nullable(),
  rejection_reason: model.text().nullable(),

  // Metadata
  metadata: model.json().default({}),
})

export default Company
