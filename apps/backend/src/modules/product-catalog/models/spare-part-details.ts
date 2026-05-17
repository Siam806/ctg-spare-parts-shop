import { model } from "@medusajs/framework/utils"

const SparePartDetails = model.define("spare_part_details", {
  id: model.id().primaryKey(),
  product_id: model.text(),
  
  // Part numbers
  oem_part_number: model.text().nullable(),
  internal_sku: model.text(),
  
  // Categorization
  brand: model.text(),
  device_model: model.text(),
  part_type: model.text(), // transducer, belt, cable, battery, probe, stylus, etc.
  
  // Compatibility - stored as JSON array of device identifiers
  compatible_device_models: model.json().default({}),
  
  // Flags
  is_discontinued: model.boolean().default(false),
  is_special_order: model.boolean().default(false),
  is_hazardous: model.boolean().default(false),
  
  // Unit of measure
  unit_of_measure: model.text().default("piece"), // piece, set, meter, etc.
  
  // Additional metadata
  specifications: model.json().default({}), // technical specs as key-value pairs
  datasheet_url: model.text().nullable(),
})

export default SparePartDetails
