import ProductModule from "@medusajs/medusa/product"
import ProductCatalogModule from "../modules/product-catalog"
import { defineLink } from "@medusajs/framework/utils"

export default defineLink(
  ProductModule.linkable.product,
  ProductCatalogModule.linkable.sparePartDetails
)
