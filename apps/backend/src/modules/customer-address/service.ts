import { MedusaService } from "@medusajs/framework/utils"
import CustomerAddress from "./models/customer-address"

/**
 * CustomerAddressModuleService
 *
 * Manages saved customer shipping addresses.
 *
 * Features:
 * - CRUD operations on customer addresses
 * - Set default shipping/billing addresses
 * - List addresses by customer or company
 */
class CustomerAddressModuleService extends MedusaService({
  CustomerAddress,
}) {
  /**
   * Get all addresses for a customer
   */
  async getCustomerAddresses(customerId: string) {
    return this.listCustomerAddresses(
      { customer_id: customerId },
      { order: { created_at: "DESC" } }
    )
  }

  /**
   * Get default shipping address for a customer
   */
  async getDefaultShippingAddress(customerId: string) {
    const addresses = await this.listCustomerAddresses(
      { customer_id: customerId, is_default_shipping: true },
      { take: 1 }
    )
    return addresses[0] || null
  }

  /**
   * Set an address as default shipping
   */
  async setDefaultShipping(customerId: string, addressId: string) {
    // First, unset any existing default
    const existingDefaults = await this.listCustomerAddresses({
      customer_id: customerId,
      is_default_shipping: true,
    })

    if (existingDefaults.length > 0) {
      await this.updateCustomerAddresses(
        existingDefaults.map((a) => ({
          id: a.id,
          is_default_shipping: false,
        }))
      )
    }

    // Set the new default
    return this.updateCustomerAddresses({
      id: addressId,
      is_default_shipping: true,
    })
  }

  /**
   * Create a new address for a customer
   */
  async createCustomerAddress(data: {
    customer_id: string
    company_id?: string
    name: string
    company_name?: string
    address_line_1: string
    address_line_2?: string
    city: string
    postal_code: string
    province?: string
    country_code: string
    phone?: string
    is_default_shipping?: boolean
    is_default_billing?: boolean
  }) {
    const address = await this.createCustomerAddresses(data)

    // If this is the first address or marked as default, set it as default
    if (data.is_default_shipping) {
      await this.setDefaultShipping(data.customer_id, address.id)
    }

    return address
  }

  /**
   * Delete an address
   */
  async deleteCustomerAddress(addressId: string) {
    await this.deleteCustomerAddresses(addressId)
  }

  /**
   * Validate a shipping address structure
   */
  validateAddress(address: {
    name?: string
    address_line_1?: string
    city?: string
    postal_code?: string
    country_code?: string
  }): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!address.name?.trim()) {
      errors.push("Name is required")
    }
    if (!address.address_line_1?.trim()) {
      errors.push("Address line 1 is required")
    }
    if (!address.city?.trim()) {
      errors.push("City is required")
    }
    if (!address.postal_code?.trim()) {
      errors.push("Postal code is required")
    }
    if (!address.country_code?.trim()) {
      errors.push("Country code is required")
    } else if (address.country_code.length !== 2) {
      errors.push("Country code must be 2 characters (ISO 3166-1 alpha-2)")
    }

    return { valid: errors.length === 0, errors }
  }
}

export default CustomerAddressModuleService
