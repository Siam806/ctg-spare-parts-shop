import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CUSTOMER_ADDRESS_MODULE } from "../../../../modules/customer-address"
import CustomerAddressModuleService from "../../../../modules/customer-address/service"
import { getAuthCompany } from "../../../../utils/get-auth-company"

/**
 * GET /store/checkout/addresses
 *
 * List saved shipping addresses for the authenticated customer.
 * Returns addresses sorted by default status.
 *
 * SC-03: Buyer selects shipping address from saved addresses
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customerAddressService: CustomerAddressModuleService = req.scope.resolve(CUSTOMER_ADDRESS_MODULE)
  const logger = req.scope.resolve("logger")

  // Get authenticated customer
  const customerId = (req as any).auth_context?.actor_id
  if (!customerId) {
    return res.status(401).json({
      type: "unauthorized",
      message: "Authentication required",
    })
  }

  try {
    const addresses = await customerAddressService.getCustomerAddresses(customerId)

    // Sort: default shipping first, then by created_at desc
    const sorted = addresses.sort((a: any, b: any) => {
      if (a.is_default_shipping && !b.is_default_shipping) return -1
      if (!a.is_default_shipping && b.is_default_shipping) return 1
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    logger.info(`[Checkout API] Listed ${addresses.length} addresses for customer ${customerId}`)

    return res.json({
      addresses: sorted.map((addr: any) => ({
        id: addr.id,
        name: addr.name,
        company_name: addr.company_name,
        address_line_1: addr.address_line_1,
        address_line_2: addr.address_line_2,
        city: addr.city,
        postal_code: addr.postal_code,
        province: addr.province,
        country_code: addr.country_code,
        phone: addr.phone,
        is_default_shipping: addr.is_default_shipping,
        is_default_billing: addr.is_default_billing,
        created_at: addr.created_at,
      })),
    })
  } catch (error: any) {
    logger.error(`[Checkout API] Failed to list addresses: ${error.message}`)
    return res.status(500).json({
      type: "error",
      message: "Failed to retrieve addresses",
    })
  }
}

/**
 * POST /store/checkout/addresses
 *
 * Create a new shipping address for the authenticated customer.
 *
 * SC-03: Save ad-hoc address for future use
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerAddressService: CustomerAddressModuleService = req.scope.resolve(CUSTOMER_ADDRESS_MODULE)
  const logger = req.scope.resolve("logger")

  // Get authenticated customer
  const customerId = (req as any).auth_context?.actor_id
  if (!customerId) {
    return res.status(401).json({
      type: "unauthorized",
      message: "Authentication required",
    })
  }

  // Get company context if available
  const company = await getAuthCompany(req)

  const {
    name,
    company_name,
    address_line_1,
    address_line_2,
    city,
    postal_code,
    province,
    country_code,
    phone,
    is_default_shipping,
    is_default_billing,
  } = req.body as {
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
  }

  // Validate required fields
  const validation = customerAddressService.validateAddress({
    name,
    address_line_1,
    city,
    postal_code,
    country_code,
  })

  if (!validation.valid) {
    return res.status(400).json({
      type: "invalid_data",
      message: "Invalid address",
      errors: validation.errors,
    })
  }

  try {
    const address = await customerAddressService.createCustomerAddress({
      customer_id: customerId,
      company_id: company?.id,
      name,
      company_name,
      address_line_1,
      address_line_2,
      city,
      postal_code,
      province,
      country_code: country_code.toUpperCase(),
      phone,
      is_default_shipping: is_default_shipping || false,
      is_default_billing: is_default_billing || false,
    })

    logger.info(`[Checkout API] Created address ${address.id} for customer ${customerId}`)

    return res.status(201).json({
      address: {
        id: address.id,
        name: address.name,
        company_name: address.company_name,
        address_line_1: address.address_line_1,
        address_line_2: address.address_line_2,
        city: address.city,
        postal_code: address.postal_code,
        province: address.province,
        country_code: address.country_code,
        phone: address.phone,
        is_default_shipping: address.is_default_shipping,
        is_default_billing: address.is_default_billing,
        created_at: address.created_at,
      },
    })
  } catch (error: any) {
    logger.error(`[Checkout API] Failed to create address: ${error.message}`)
    return res.status(500).json({
      type: "error",
      message: "Failed to create address",
    })
  }
}
