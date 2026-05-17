import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PRODUCT_CATALOG_MODULE } from "../../../modules/product-catalog"
import ProductCatalogModuleService from "../../../modules/product-catalog/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const productCatalogService: ProductCatalogModuleService = req.scope.resolve(PRODUCT_CATALOG_MODULE)
  
  const { limit = "20", offset = "0", brand } = req.query as Record<string, string>
  
  const filters: any = {}
  if (brand) {
    filters.brand = brand
  }
  
  const [devices, count] = await productCatalogService.listAndCountDevices({
    where: filters,
    skip: parseInt(offset, 10),
    take: parseInt(limit, 10),
  })
  
  res.json({
    devices,
    count,
    limit: parseInt(limit, 10),
    offset: parseInt(offset, 10),
  })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const productCatalogService: ProductCatalogModuleService = req.scope.resolve(PRODUCT_CATALOG_MODULE)
  
  const data = req.body as any
  
  const device = await productCatalogService.createDevices(data)
  
  res.status(201).json({
    device,
  })
}
