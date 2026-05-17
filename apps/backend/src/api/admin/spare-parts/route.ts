import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PRODUCT_CATALOG_MODULE } from "../../../modules/product-catalog"
import ProductCatalogModuleService from "../../../modules/product-catalog/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const productCatalogService: ProductCatalogModuleService = req.scope.resolve(PRODUCT_CATALOG_MODULE)
  
  const { limit = "20", offset = "0", product_id } = req.query as Record<string, string>

  const filters: Record<string, any> = {}
  if (product_id) {
    filters.product_id = product_id
  }

  const spareParts = await productCatalogService.listSparePartDetails(filters, {
    take: parseInt(limit, 10),
    skip: parseInt(offset, 10),
  })
  
  res.json({
    spare_parts: spareParts,
    count: spareParts.length,
    limit: parseInt(limit, 10),
    offset: parseInt(offset, 10),
  })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const productCatalogService: ProductCatalogModuleService = req.scope.resolve(PRODUCT_CATALOG_MODULE)
  
  const data = req.body as any
  
  const sparePart = await productCatalogService.createSparePartDetails(data)
  
  res.status(201).json({
    spare_part: sparePart,
  })
}
