/**
 * Shipping Module Types
 *
 * Shared type definitions for multi-carrier shipping integration.
 */

export type CarrierType = "sendcloud" | "postnl"

export interface CarrierRate {
  id: string
  carrier: CarrierType
  service: string // e.g., "standard", "express"
  serviceName: string // Human readable name
  price: number // in cents
  currency: string
  transitTimeMin?: number // days
  transitTimeMax?: number // days
  isHazmatAllowed: boolean
}

export interface Address {
  company?: string
  name: string
  street: string
  houseNumber?: string
  address2?: string
  city: string
  postalCode: string
  country: string // ISO 3166-1 alpha-2
  phone?: string
  email?: string
}

export interface ShipmentRequest {
  orderId: string
  from: Address
  to: Address
  weight: number // in grams
  dimensions?: {
    length: number // cm
    width: number // cm
    height: number // cm
  }
  value?: number // parcel value for insurance (cents)
  description?: string
  reference?: string // customer reference
  isHazmat?: boolean
  hazmatType?: "lithium" | "magnetized" | "dry_ice" | "other"
  signatureRequired?: boolean
  saturdayDelivery?: boolean
  carrier?: CarrierType
  service?: string // specific service level
}

export interface LabelResult {
  trackingNumber: string
  labelUrl: string // URL to PDF label
  trackingUrl: string // URL for customer tracking
  carrier: CarrierType
  service: string
  cost: number // in cents
  estimatedDelivery?: Date
}

export interface TrackingEvent {
  timestamp: Date
  status: "pending" | "in_transit" | "out_for_delivery" | "delivered" | "exception"
  location?: string
  description: string
}

export interface TrackingInfo {
  trackingNumber: string
  carrier: CarrierType
  status: "pending" | "in_transit" | "out_for_delivery" | "delivered" | "exception"
  events: TrackingEvent[]
  estimatedDelivery?: Date
}

export interface CarrierConfig {
  enabled: boolean
  sandbox?: boolean
}

// Carrier-specific config types
export interface SendCloudConfig extends CarrierConfig {
  apiKey: string
  apiSecret: string
  defaultSenderAddress?: Address
}

export interface PostNLConfig extends CarrierConfig {
  apiKey: string
  customerCode?: string
  customerNumber?: string
  defaultSenderAddress?: Address
}
