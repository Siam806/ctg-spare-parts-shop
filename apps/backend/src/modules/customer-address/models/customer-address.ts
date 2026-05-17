import { model } from "@medusajs/framework/utils"

/**
 * CustomerAddress
 *
 * Saved shipping addresses for B2B customers.
 * Each address belongs to a company and can be used at checkout.
 *
 * SC-03: Buyer selects shipping address from saved addresses or enters ad hoc
 */
const CustomerAddress = model.define("customer_address", {
  id: model.id().primaryKey(),

  // Link to Medusa customer
  customer_id: model.text().index(),

  // Link to company account (for B2B context)
  company_id: model.text().index().nullable(),

  // Address type
  is_default_shipping: model.boolean().default(false),
  is_default_billing: model.boolean().default(false),

  // Address fields
  name: model.text(), // Contact person name
  company_name: model.text().nullable(), // Company name for delivery
  address_line_1: model.text(),
  address_line_2: model.text().nullable(),
  city: model.text(),
  postal_code: model.text(),
  province: model.text().nullable(),
  country_code: model.text(), // ISO 3166-1 alpha-2

  // Contact
  phone: model.text().nullable(),

  // Metadata
  metadata: model.json().default({}),
})

export default CustomerAddress
