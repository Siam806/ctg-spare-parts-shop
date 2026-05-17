import { Module } from "@medusajs/framework/utils"
import ProductCatalogModuleService from "./service"

export const PRODUCT_CATALOG_MODULE = "productCatalog"

export default Module(PRODUCT_CATALOG_MODULE, {
  service: ProductCatalogModuleService,
})
