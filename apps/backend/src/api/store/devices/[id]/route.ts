import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { PRODUCT_CATALOG_MODULE } from "../../../../modules/product-catalog"
import ProductCatalogModuleService from "../../../../modules/product-catalog/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const productCatalogService: ProductCatalogModuleService = req.scope.resolve(PRODUCT_CATALOG_MODULE)
    const productService = req.scope.resolve(Modules.PRODUCT)
    
    const { id } = req.params
    
    // Get the device
    const device = await productCatalogService.retrieveDevice(id)
    
    if (!device) {
      return res.status(404).json({
        code: "not_found",
        type: "not_found",
        message: `Device with id ${id} not found`,
      })
    }
    
    // Find all compatible spare parts for this device
    const spareParts = await productCatalogService.listSparePartDetails({
      device_model: device.model_name,
    })
    
    // Enrich with product data
    const productIds = spareParts
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
    
    const enrichedParts = spareParts.map((sp: any) => ({
      ...sp,
      product: productsMap[sp.product_id] || null,
    }))
    
    res.json({
      device,
      compatible_parts: enrichedParts,
      compatible_parts_count: enrichedParts.length,
    })
  } catch (error: any) {
    console.error("Error retrieving device:", error)
    res.status(500).json({
      code: "retrieve_error",
      type: "retrieve_error",
      message: error.message || "An error occurred while retrieving the device",
    })
  }
}
