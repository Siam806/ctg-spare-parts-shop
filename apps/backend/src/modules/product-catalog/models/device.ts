import { model } from "@medusajs/framework/utils"

const Device = model.define("device", {
  id: model.id().primaryKey(),
  
  // Device identification
  brand: model.text(),
  product_line: model.text().nullable(),
  model_name: model.text(),
  model_number: model.text().nullable(),
  
  // Serial number prefix pattern for lookup
  serial_number_prefix: model.text().nullable(),
  
  // Description
  description: model.text().nullable(),
  
  // Metadata
  specifications: model.json().default({}),
  manual_url: model.text().nullable(),
  
  // Status
  is_active: model.boolean().default(true),
})

export default Device
