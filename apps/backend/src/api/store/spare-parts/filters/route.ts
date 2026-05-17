import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PRODUCT_CATALOG_MODULE } from "../../../../modules/product-catalog"
import ProductCatalogModuleService from "../../../../modules/product-catalog/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const productCatalogService: ProductCatalogModuleService = req.scope.resolve(PRODUCT_CATALOG_MODULE)
  
  // Get all spare part details to extract unique filter values
  const allSpareParts = await productCatalogService.listSparePartDetails({})
  
  // Extract unique values for filters
  const brands = [...new Set(allSpareParts.map((sp: any) => sp.brand).filter(Boolean))]
  const deviceModels = [...new Set(allSpareParts.map((sp: any) => sp.device_model).filter(Boolean))]
  const partTypes = [...new Set(allSpareParts.map((sp: any) => sp.part_type).filter(Boolean))]
  
  res.json({
    filters: {
      brands,
      device_models: deviceModels,
      part_types: partTypes,
    },
  })
}
