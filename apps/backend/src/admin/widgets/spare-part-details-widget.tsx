import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Container, Heading, Input, Select, Button, Badge, Switch } from "@medusajs/ui"
import { useState, useEffect } from "react"

type SparePartDetails = {
  id: string
  product_id: string
  oem_part_number: string | null
  internal_sku: string
  brand: string
  device_model: string
  part_type: string
  is_discontinued: boolean
  is_special_order: boolean
  is_hazardous: boolean
  unit_of_measure: string
  datasheet_url: string | null
}

const PART_TYPES = [
  "transducer",
  "belt",
  "cable",
  "battery",
  "probe",
  "stylus",
  "sensor",
  "adapter",
  "paper",
  "filter",
  "other",
]

const SparePartDetailsWidget = ({ data }: { data: { id: string } }) => {
  const productId = data.id
  const queryClient = useQueryClient()

  const [formData, setFormData] = useState({
    oem_part_number: "",
    internal_sku: "",
    brand: "",
    device_model: "",
    part_type: "other",
    is_discontinued: false,
    is_special_order: false,
    is_hazardous: false,
    unit_of_measure: "piece",
    datasheet_url: "",
  })

  // Fetch existing spare part details for this product
  const { data: existingData, isLoading } = useQuery({
    queryKey: ["spare-part-details", productId],
    queryFn: async () => {
      const res = await fetch(
        `/admin/spare-parts?product_id=${productId}`,
        { credentials: "include" }
      )
      if (!res.ok) return null
      const json = await res.json()
      // Find the spare part linked to this product
      const spareParts = json.spare_parts || []
      return spareParts.find((sp: SparePartDetails) => sp.product_id === productId) || null
    },
  })

  useEffect(() => {
    if (existingData) {
      setFormData({
        oem_part_number: existingData.oem_part_number || "",
        internal_sku: existingData.internal_sku || "",
        brand: existingData.brand || "",
        device_model: existingData.device_model || "",
        part_type: existingData.part_type || "other",
        is_discontinued: existingData.is_discontinued || false,
        is_special_order: existingData.is_special_order || false,
        is_hazardous: existingData.is_hazardous || false,
        unit_of_measure: existingData.unit_of_measure || "piece",
        datasheet_url: existingData.datasheet_url || "",
      })
    }
  }, [existingData])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = {
        ...formData,
        product_id: productId,
        oem_part_number: formData.oem_part_number || null,
        datasheet_url: formData.datasheet_url || null,
      }

      if (existingData?.id) {
        // Update existing
        const res = await fetch(`/admin/spare-parts/${existingData.id}`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        return res.json()
      } else {
        // Create new
        const res = await fetch("/admin/spare-parts", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        return res.json()
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spare-part-details", productId] })
    },
  })

  if (isLoading) {
    return (
      <Container>
        <Heading level="h2">Spare Part Details</Heading>
        <p>Loading...</p>
      </Container>
    )
  }

  return (
    <Container>
      <div className="flex items-center justify-between mb-4">
        <Heading level="h2">Spare Part Details</Heading>
        {existingData && <Badge color="green">Linked</Badge>}
        {!existingData && <Badge color="orange">Not configured</Badge>}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-sm font-medium mb-1 block">Internal SKU *</label>
          <Input
            placeholder="CTG-001"
            value={formData.internal_sku}
            onChange={(e) => setFormData({ ...formData, internal_sku: e.target.value })}
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">OEM Part Number</label>
          <Input
            placeholder="M2736A"
            value={formData.oem_part_number}
            onChange={(e) => setFormData({ ...formData, oem_part_number: e.target.value })}
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Brand *</label>
          <Input
            placeholder="Philips"
            value={formData.brand}
            onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Device Model *</label>
          <Input
            placeholder="Avalon FM50"
            value={formData.device_model}
            onChange={(e) => setFormData({ ...formData, device_model: e.target.value })}
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Part Type *</label>
          <Select
            value={formData.part_type}
            onValueChange={(value) => setFormData({ ...formData, part_type: value })}
          >
            <Select.Trigger>
              <Select.Value placeholder="Select type" />
            </Select.Trigger>
            <Select.Content>
              {PART_TYPES.map((type) => (
                <Select.Item key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Unit of Measure</label>
          <Input
            placeholder="piece"
            value={formData.unit_of_measure}
            onChange={(e) => setFormData({ ...formData, unit_of_measure: e.target.value })}
          />
        </div>
        <div className="col-span-2">
          <label className="text-sm font-medium mb-1 block">Datasheet URL</label>
          <Input
            placeholder="https://..."
            value={formData.datasheet_url}
            onChange={(e) => setFormData({ ...formData, datasheet_url: e.target.value })}
          />
        </div>
      </div>

      <div className="flex gap-6 mb-4">
        <div className="flex items-center gap-2">
          <Switch
            checked={formData.is_discontinued}
            onCheckedChange={(checked) => setFormData({ ...formData, is_discontinued: checked })}
          />
          <label className="text-sm">Discontinued</label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={formData.is_special_order}
            onCheckedChange={(checked) => setFormData({ ...formData, is_special_order: checked })}
          />
          <label className="text-sm">Special Order</label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={formData.is_hazardous}
            onCheckedChange={(checked) => setFormData({ ...formData, is_hazardous: checked })}
          />
          <label className="text-sm">Hazardous</label>
        </div>
      </div>

      <Button
        variant="primary"
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending || !formData.internal_sku || !formData.brand || !formData.device_model}
      >
        {saveMutation.isPending
          ? "Saving..."
          : existingData
          ? "Update Spare Part Details"
          : "Save Spare Part Details"}
      </Button>

      {saveMutation.isSuccess && (
        <p className="text-green-600 text-sm mt-2">Saved successfully!</p>
      )}
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default SparePartDetailsWidget
