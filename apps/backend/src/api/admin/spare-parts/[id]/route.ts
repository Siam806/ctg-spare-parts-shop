import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PRODUCT_CATALOG_MODULE } from "../../../../modules/product-catalog"
import ProductCatalogModuleService from "../../../../modules/product-catalog/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const productCatalogService: ProductCatalogModuleService =
    req.scope.resolve(PRODUCT_CATALOG_MODULE)

  const { id } = req.params
  const sparePart = await productCatalogService.retrieveSparePartDetails(id)

  res.json({ spare_part: sparePart })
}

export const PUT = async (req: MedusaRequest, res: MedusaResponse) => {
  const productCatalogService: ProductCatalogModuleService =
    req.scope.resolve(PRODUCT_CATALOG_MODULE)

  const { id } = req.params
  const data = req.body as any

  const sparePart = await productCatalogService.updateSparePartDetails({
    id,
    ...data,
  })

  res.json({ spare_part: sparePart })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const productCatalogService: ProductCatalogModuleService =
    req.scope.resolve(PRODUCT_CATALOG_MODULE)

  const { id } = req.params
  await productCatalogService.deleteSparePartDetails(id)

  res.sendStatus(204)
}
