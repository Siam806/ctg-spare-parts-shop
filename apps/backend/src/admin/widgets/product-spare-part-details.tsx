import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text, Input, Label, Button } from "@medusajs/ui"
import { useState, useEffect } from "react"

// Admin widget to display and edit spare part details
// Uses direct API calls instead of hooks to avoid dependency issues
const ProductSparePartDetailsWidget = ({ data }: { data: { id: string } }) => {
  const [product, setProduct] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  
  const [sparePartData, setSparePartData] = useState({
    oem_part_number: "",
    internal_sku: "",
    brand: "",
    device_model: "",
    part_type: "",
    is_discontinued: false,
    is_special_order: false,
    is_hazardous: false,
    unit_of_measure: "piece",
  })

  // Fetch product data on mount
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(`/admin/products/${data.id}`, {
          credentials: "include",
        })
        if (response.ok) {
          const { product } = await response.json()
          setProduct(product)
          
          // Load spare part data if it exists
          if (product?.metadata?.spare_part_details) {
            setSparePartData(product.metadata.spare_part_details as any)
          }
        }
      } catch (error) {
        console.error("Error fetching product:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProduct()
  }, [data.id])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/admin/products/${data.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          metadata: {
            ...product?.metadata,
            spare_part_details: sparePartData,
          },
        }),
      })

      if (response.ok) {
        // Show success message
        alert("Spare part details saved successfully!")
      } else {
        alert("Failed to save spare part details")
      }
    } catch (error) {
      console.error("Error saving:", error)
      alert("Error saving spare part details")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h2">Spare Part Details</Heading>
        </div>
        <div className="px-6 py-4">
          <Text>Loading...</Text>
        </div>
      </Container>
    )
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Spare Part Details</Heading>
      </div>

      <div className="px-6 py-4 grid gap-4">
        {/* Part Numbers */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="oem_part_number">OEM Part Number</Label>
            <Input
              id="oem_part_number"
              value={sparePartData.oem_part_number}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSparePartData({ ...sparePartData, oem_part_number: e.target.value })
              }
              placeholder="e.g., 5700AAXX"
            />
          </div>
          <div>
            <Label htmlFor="internal_sku">Internal SKU</Label>
            <Input
              id="internal_sku"
              value={sparePartData.internal_sku}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSparePartData({ ...sparePartData, internal_sku: e.target.value })
              }
              placeholder="e.g., CTG-TR-001"
            />
          </div>
        </div>

        {/* Categorization */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="brand">Brand</Label>
            <Input
              id="brand"
              value={sparePartData.brand}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSparePartData({ ...sparePartData, brand: e.target.value })
              }
              placeholder="e.g., GE, Philips, HP"
            />
          </div>
          <div>
            <Label htmlFor="device_model">Device Model</Label>
            <Input
              id="device_model"
              value={sparePartData.device_model}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSparePartData({ ...sparePartData, device_model: e.target.value })
              }
              placeholder="e.g., Corometrics 170"
            />
          </div>
          <div>
            <Label htmlFor="part_type">Part Type</Label>
            <Input
              id="part_type"
              value={sparePartData.part_type}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSparePartData({ ...sparePartData, part_type: e.target.value })
              }
              placeholder="e.g., transducer, cable"
            />
          </div>
        </div>

        {/* Flags */}
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_discontinued"
              checked={sparePartData.is_discontinued}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSparePartData({ ...sparePartData, is_discontinued: e.target.checked })
              }
              className="w-4 h-4"
            />
            <Label htmlFor="is_discontinued">Discontinued</Label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_special_order"
              checked={sparePartData.is_special_order}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSparePartData({ ...sparePartData, is_special_order: e.target.checked })
              }
              className="w-4 h-4"
            />
            <Label htmlFor="is_special_order">Special Order</Label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_hazardous"
              checked={sparePartData.is_hazardous}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSparePartData({ ...sparePartData, is_hazardous: e.target.checked })
              }
              className="w-4 h-4"
            />
            <Label htmlFor="is_hazardous">Hazardous</Label>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end mt-4">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            variant="primary"
          >
            {isSaving ? "Saving..." : "Save Spare Part Details"}
          </Button>
        </div>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side.before",
})

export default ProductSparePartDetailsWidget
