"use client"

import { useEffect, useState } from "react"
import { Badge, Text, Container, Heading } from "@modules/common/components/ui"
import { sdk } from "@lib/config"

interface SparePartInfo {
  id: string
  oem_part_number: string | null
  internal_sku: string
  brand: string
  device_model: string
  part_type: string
  is_discontinued: boolean
  is_special_order: boolean
  is_hazardous: boolean
  unit_of_measure: string
  specifications: Record<string, unknown>
}

interface ProductSparePartInfoProps {
  productId: string
}

export default function ProductSparePartInfo({ productId }: ProductSparePartInfoProps) {
  const [sparePartInfo, setSparePartInfo] = useState<SparePartInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchSparePartInfo = async () => {
      try {
        // Search for spare part by product_id
        const response = await sdk.client.fetch(`/store/spare-parts/search?part_number=${productId}`, {
          method: "GET",
        })
        
        const data = response as { spare_parts: SparePartInfo[] }
        
        if (data.spare_parts && data.spare_parts.length > 0) {
          setSparePartInfo(data.spare_parts[0])
        }
      } catch (error) {
        console.error("Error fetching spare part info:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSparePartInfo()
  }, [productId])

  if (isLoading) {
    return (
      <Container className="mt-4">
        <Text>Loading spare part details...</Text>
      </Container>
    )
  }

  if (!sparePartInfo) {
    return null
  }

  const getPartTypeLabel = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1)
  }

  return (
    <Container className="mt-6">
      <Heading level="h3" className="mb-4">
        Spare Part Details
      </Heading>

      {/* Flags */}
      <div className="flex flex-wrap gap-2 mb-4">
        {sparePartInfo.is_discontinued && (
          <Badge color="red">Discontinued</Badge>
        )}
        {sparePartInfo.is_special_order && (
          <Badge color="orange">Special Order</Badge>
        )}
        {sparePartInfo.is_hazardous && (
          <Badge color="blue">Hazardous</Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        {/* Part Numbers */}
        <div>
          <Text className="text-gray-500">Internal SKU</Text>
          <Text className="font-medium">{sparePartInfo.internal_sku}</Text>
        </div>
        {sparePartInfo.oem_part_number && (
          <div>
            <Text className="text-gray-500">OEM Part Number</Text>
            <Text className="font-medium">{sparePartInfo.oem_part_number}</Text>
          </div>
        )}

        {/* Brand & Model */}
        <div>
          <Text className="text-gray-500">Brand</Text>
          <Text className="font-medium">{sparePartInfo.brand}</Text>
        </div>
        <div>
          <Text className="text-gray-500">Device Model</Text>
          <Text className="font-medium">{sparePartInfo.device_model}</Text>
        </div>

        {/* Part Type & Unit */}
        <div>
          <Text className="text-gray-500">Part Type</Text>
          <Text className="font-medium">{getPartTypeLabel(sparePartInfo.part_type)}</Text>
        </div>
        <div>
          <Text className="text-gray-500">Unit of Measure</Text>
          <Text className="font-medium">{sparePartInfo.unit_of_measure}</Text>
        </div>
      </div>

      {/* Specifications */}
      {sparePartInfo.specifications && Object.keys(sparePartInfo.specifications).length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <Text className="text-gray-500 mb-2">Specifications</Text>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {Object.entries(sparePartInfo.specifications).map(([key, value]) => (
              <div key={key}>
                <Text className="text-gray-500 capitalize">{key}</Text>
                <Text className="font-medium">{String(value)}</Text>
              </div>
            ))}
          </div>
        </div>
      )}
    </Container>
  )
}
