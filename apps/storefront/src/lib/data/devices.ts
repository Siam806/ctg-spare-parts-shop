import { sdk } from "@lib/config"

export interface Device {
  id: string
  brand: string
  product_line: string | null
  model_name: string
  model_number: string | null
  serial_number_prefix: string | null
  description: string | null
  specifications: Record<string, any>
  manual_url: string | null
  is_active: boolean
}

export interface DeviceListResponse {
  devices: Device[]
  count: number
  limit: number
  offset: number
}

export interface DeviceWithPartsResponse {
  device: Device
  compatible_parts: any[]
  compatible_parts_count: number
}

export interface DeviceFilters {
  brand?: string
  product_line?: string
  serial_prefix?: string
  limit?: number
  offset?: number
}

export async function listDevices(filters: DeviceFilters = {}): Promise<DeviceListResponse> {
  const params = new URLSearchParams()
  
  if (filters.brand) params.append("brand", filters.brand)
  if (filters.product_line) params.append("product_line", filters.product_line)
  if (filters.serial_prefix) params.append("serial_prefix", filters.serial_prefix)
  if (filters.limit) params.append("limit", filters.limit.toString())
  if (filters.offset) params.append("offset", filters.offset.toString())
  
  const queryString = params.toString()
  const url = `/store/devices${queryString ? `?${queryString}` : ""}`
  
  const response = await sdk.client.fetch<DeviceListResponse>(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })
  
  return response
}

export async function getDeviceWithParts(deviceId: string): Promise<DeviceWithPartsResponse> {
  const response = await sdk.client.fetch<DeviceWithPartsResponse>(`/store/devices/${deviceId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })
  
  return response
}

export async function getDeviceFilters(): Promise<{ brands: string[]; product_lines: string[] }> {
  // Get all devices to extract unique brands and product lines
  const response = await listDevices({ limit: 1000 })
  
  const brands = Array.from(new Set(response.devices.map((d) => d.brand))).sort()
  const product_lines = Array.from(new Set(response.devices.map((d) => d.product_line).filter(Boolean))).sort() as string[]
  
  return { brands, product_lines }
}
