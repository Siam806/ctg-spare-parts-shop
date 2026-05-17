import { Badge } from "@modules/common/components/ui"
import { SparePartDetails } from "@lib/data/spare-parts"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

interface SparePartCardProps {
  sparePart: SparePartDetails
}

export default function SparePartCard({ sparePart }: SparePartCardProps) {
  const getPartTypeLabel = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1)
  }

  const productHandle = sparePart.product?.handle
  const href = productHandle ? `/products/${productHandle}` : "#"

  return (
    <LocalizedClientLink href={href}>
      <div className="group bg-white border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
        {/* Thumbnail */}
        {sparePart.product?.thumbnail && (
          <div className="mb-3 aspect-square w-full relative overflow-hidden rounded bg-gray-50">
            <img
              src={sparePart.product.thumbnail}
              alt={sparePart.product.title}
              className="object-cover w-full h-full group-hover:scale-105 transition-transform"
            />
          </div>
        )}

        {/* Header with flags */}
        <div className="flex flex-wrap gap-1 mb-2">
          {sparePart.is_discontinued && (
            <Badge color="red">Discontinued</Badge>
          )}
          {sparePart.is_special_order && (
            <Badge color="orange">Special Order</Badge>
          )}
          {sparePart.is_hazardous && (
            <Badge color="blue">Hazardous</Badge>
          )}
        </div>

        {/* Product Title */}
        {sparePart.product?.title && (
          <div className="font-semibold text-base mb-1 group-hover:text-ui-fg-interactive">
            {sparePart.product.title}
          </div>
        )}

        {/* Part Number */}
        <div className="text-sm text-gray-500 mb-1">
          {sparePart.oem_part_number && (
            <span className="mr-2">OEM: {sparePart.oem_part_number}</span>
          )}
          <span>SKU: {sparePart.internal_sku}</span>
        </div>

        {/* Brand & Model */}
        <div className="text-sm text-gray-600 mb-1">
          {sparePart.brand} &middot; {sparePart.device_model}
        </div>

        {/* Part Type */}
        <Badge color="grey" className="mb-2">
          {getPartTypeLabel(sparePart.part_type)}
        </Badge>

        {/* Unit of Measure */}
        <div className="text-sm text-gray-500 mt-2">
          Unit: {sparePart.unit_of_measure}
        </div>
      </div>
    </LocalizedClientLink>
  )
}
