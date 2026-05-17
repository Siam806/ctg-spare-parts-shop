import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { PRODUCT_CATALOG_MODULE } from "../../../../modules/product-catalog"
import ProductCatalogModuleService from "../../../../modules/product-catalog/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const productCatalogService: ProductCatalogModuleService = req.scope.resolve(PRODUCT_CATALOG_MODULE)
    const productService = req.scope.resolve(Modules.PRODUCT)

    const {
      brand,
      device_model,
      part_type,
      keyword,
      part_number,
      is_discontinued,
      is_special_order,
      is_hazardous,
      limit = "20",
      offset = "0",
    } = req.query as Record<string, string>

    const filters: any = {}

    if (brand) filters.brand = brand
    if (device_model) filters.device_model = device_model
    if (part_type) filters.part_type = part_type
    if (is_discontinued !== undefined) filters.is_discontinued = is_discontinued === "true"
    if (is_special_order !== undefined) filters.is_special_order = is_special_order === "true"
    if (is_hazardous !== undefined) filters.is_hazardous = is_hazardous === "true"

    let sparePartDetails: any[] = []
    let count = 0

    if (part_number) {
      const results = await productCatalogService.findByPartNumber(part_number)
      sparePartDetails = results
      count = results.length
    } else if (keyword) {
      const allResults = await productCatalogService.searchProducts({})
      const lowerKeyword = keyword.toLowerCase()
      sparePartDetails = allResults.filter((sp: any) =>
        sp.oem_part_number?.toLowerCase().includes(lowerKeyword) ||
        sp.internal_sku?.toLowerCase().includes(lowerKeyword) ||
        sp.brand?.toLowerCase().includes(lowerKeyword) ||
        sp.device_model?.toLowerCase().includes(lowerKeyword) ||
        sp.part_type?.toLowerCase().includes(lowerKeyword)
      )
      count = sparePartDetails.length
    } else {
      const results = await productCatalogService.searchProducts(filters)
      sparePartDetails = results
      count = results.length
    }

    const limitNum = parseInt(limit, 10)
    const offsetNum = parseInt(offset, 10)
    const paginatedResults = sparePartDetails.slice(offsetNum, offsetNum + limitNum)

    const productIds = paginatedResults
      .map((sp: any) => sp.product_id)
      .filter(Boolean)

    let productsMap: Record<string, any> = {}
    if (productIds.length > 0) {
      const products = await productService.listProducts(
        { id: productIds },
        { select: ["id", "title", "handle", "thumbnail", "status"] }
      )
      productsMap = Object.fromEntries(products.map((p: any) => [p.id, p]))
    }

    const enrichedResults = paginatedResults.map((sp: any) => ({
      ...sp,
      product: productsMap[sp.product_id] || null,
    }))

    res.json({
      spare_parts: enrichedResults,
      count,
      limit: limitNum,
      offset: offsetNum,
    })
  } catch (error: any) {
    console.error("Error in spare parts search:", error)
    res.status(500).json({
      code: "search_error",
      type: "search_error",
      message: error.message || "An error occurred during search",
    })
  }
}
