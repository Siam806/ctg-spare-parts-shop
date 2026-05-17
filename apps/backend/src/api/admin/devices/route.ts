import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PRODUCT_CATALOG_MODULE } from "../../../modules/product-catalog"
import ProductCatalogModuleService from "../../../modules/product-catalog/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const productCatalogService: ProductCatalogModuleService = req.scope.resolve(PRODUCT_CATALOG_MODULE)

    const { limit = "20", offset = "0", brand } = req.query as Record<string, string>

    const offsetNum = parseInt(offset, 10)
    const limitNum = parseInt(limit, 10)

    // Use searchDevices method for filtering
    const filteredDevices = await productCatalogService.searchDevices({
      brand,
    })

    const count = filteredDevices.length
    const devices = filteredDevices.slice(offsetNum, offsetNum + limitNum)

    res.json({
      devices,
      count,
      limit: limitNum,
      offset: offsetNum,
    })
  } catch (error: any) {
    console.error("Error listing devices:", error)
    res.status(500).json({
      code: "list_error",
      type: "list_error",
      message: error.message || "An error occurred while listing devices",
    })
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const productCatalogService: ProductCatalogModuleService = req.scope.resolve(PRODUCT_CATALOG_MODULE)
  
  const data = req.body as any
  
  const device = await productCatalogService.createDevices(data)
  
  res.status(201).json({
    device,
  })
}
