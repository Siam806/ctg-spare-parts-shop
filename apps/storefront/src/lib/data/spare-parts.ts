import { sdk } from "@lib/config"

export type SparePartProduct = {
  id: string
  title: string
  handle: string
  thumbnail: string | null
  status: string
}

export type SparePartDetails = {
  id: string
  product_id: string
  oem_part_number: string | null
  internal_sku: string
  brand: string
  device_model: string
  part_type: string
  compatible_device_models: string[]
  is_discontinued: boolean
  is_special_order: boolean
  is_hazardous: boolean
  unit_of_measure: string
  specifications: Record<string, unknown>
  datasheet_url: string | null
  created_at: string
  updated_at: string
  product: SparePartProduct | null
}

export type SparePartFilters = {
  brands: string[]
  device_models: string[]
  part_types: string[]
}

export async function searchSpareParts(params: {
  brand?: string
  device_model?: string
  part_type?: string
  keyword?: string
  part_number?: string
  is_discontinued?: boolean
  is_special_order?: boolean
  is_hazardous?: boolean
  limit?: number
  offset?: number
}): Promise<{ spare_parts: SparePartDetails[]; count: number; limit: number; offset: number }> {
  const queryParams = new URLSearchParams()
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryParams.append(key, String(value))
    }
  })
  
  const response = await sdk.client.fetch(`/store/spare-parts/search?${queryParams.toString()}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })
  
  return response as { spare_parts: SparePartDetails[]; count: number; limit: number; offset: number }
}

export async function getSparePartFilters(): Promise<{ filters: SparePartFilters }> {
  const response = await sdk.client.fetch("/store/spare-parts/filters", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })
  
  return response as { filters: SparePartFilters }
}
