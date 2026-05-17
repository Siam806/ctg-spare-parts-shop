import { listProducts } from "@lib/data/products"
import { getMyCompany } from "@lib/data/company"
import { retrieveCustomer } from "@lib/data/customer"
import { HttpTypes } from "@medusajs/types"
import ProductActions from "@modules/products/components/product-actions"

/**
 * Fetches real-time pricing, customer auth status, and company approval state,
 * then renders the product actions component.
 */
export default async function ProductActionsWrapper({
  id,
  region,
}: {
  id: string
  region: HttpTypes.StoreRegion
}) {
  const [product, customer, companyData] = await Promise.all([
    listProducts({
      queryParams: { id: [id] },
      regionId: region.id,
    }).then(({ response }) => response.products[0]),
    retrieveCustomer(),
    getMyCompany(),
  ])

  if (!product) {
    return null
  }

  // Determine whether the current user is allowed to add to cart
  let cartAllowed: "allowed" | "unauthenticated" | "no_company" | "pending" | "rejected" | "view_only" =
    "unauthenticated"

  if (customer) {
    if (!companyData) {
      cartAllowed = "no_company"
    } else if (companyData.company.approval_status === "pending") {
      cartAllowed = "pending"
    } else if (companyData.company.approval_status === "rejected") {
      cartAllowed = "rejected"
    } else if (companyData.company_user.role === "view_only") {
      cartAllowed = "view_only"
    } else {
      cartAllowed = "allowed"
    }
  }

  return <ProductActions product={product} region={region} cartAllowed={cartAllowed} />
}
