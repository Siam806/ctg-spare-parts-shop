import { model } from "@medusajs/framework/utils"

/**
 * ShipmentRecord
 *
 * Tracks all shipments created through the shipping module.
 * Links orders to carrier labels and tracking numbers.
 */
const ShipmentRecord = model.define("shipment_record", {
  id: model.id().primaryKey(),

  // Order reference
  order_id: model.text().index(),

  // Carrier information
  carrier: model.enum(["sendcloud", "postnl"]),
  service: model.text(), // service level (standard, express, etc.)

  // Tracking
  tracking_number: model.text().index(),
  tracking_url: model.text().nullable(),

  // Label
  label_url: model.text().nullable(),
  label_data: model.json().nullable(), // base64 encoded label if stored locally

  // Cost (in cents)
  cost: model.bigNumber().nullable(),
  currency: model.text().default("eur"),

  // Package details
  weight: model.bigNumber(), // in grams
  dimensions: model.json().nullable(), // { length, width, height } in cm

  // Addresses (stored as JSON for flexibility)
  from_address: model.json(),
  to_address: model.json(),

  // Hazmat
  hazmat: model.boolean().default(false),
  hazmat_type: model.enum(["lithium", "magnetized", "dry_ice", "other"]).nullable(),

  // Status
  status: model.enum([
    "created",      // Label created, not yet shipped
    "picked_up",    // Package picked up by carrier
    "in_transit",   // In transit to destination
    "out_for_delivery",
    "delivered",
    "exception",    // Delivery exception
    "returned",
  ]).default("created"),

  // Timestamps
  shipped_at: model.dateTime().nullable(),
  delivered_at: model.dateTime().nullable(),

  // Raw carrier response for debugging
  carrier_response: model.json().nullable(),
})

export default ShipmentRecord
