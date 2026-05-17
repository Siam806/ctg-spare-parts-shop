import { model } from "@medusajs/framework/utils"

export enum CompanyUserRole {
  ADMIN = "admin",
  BUYER = "buyer",
  VIEW_ONLY = "view_only",
}

const CompanyUser = model.define("company_user", {
  id: model.id().primaryKey(),

  // Links to Medusa customer
  customer_id: model.text(),

  // Links to company
  company_id: model.text(),

  // Role
  role: model.enum(CompanyUserRole).default(CompanyUserRole.BUYER),

  // Whether this user is the primary contact
  is_primary_contact: model.boolean().default(false),

  // Metadata
  metadata: model.json().default({}),
})

export default CompanyUser
