import { MedusaService } from "@medusajs/framework/utils"
import { SparePartDetails, Device } from "./models"

class ProductCatalogModuleService extends MedusaService({
  SparePartDetails,
  Device,
}) {
  // Custom methods for product catalog operations
  
  async findByDeviceModel(deviceModel: string) {
    return await this.listSparePartDetails({
      device_model: deviceModel,
    })
  }
  
  async findByPartNumber(partNumber: string) {
    // Get all and filter in memory since $or is not directly supported
    const all = await this.listSparePartDetails()
    return all.filter(
      (sp: any) =>
        sp.oem_part_number === partNumber || sp.internal_sku === partNumber
    )
  }
  
  async searchProducts(filters: {
    brand?: string
    device_model?: string
    part_type?: string
    keyword?: string
    is_discontinued?: boolean
    is_special_order?: boolean
    is_hazardous?: boolean
  }) {
    // Get all and filter in memory for now
    const all = await this.listSparePartDetails()
    return all.filter((sp: any) => {
      if (filters.brand && sp.brand !== filters.brand) return false
      if (filters.device_model && sp.device_model !== filters.device_model) return false
      if (filters.part_type && sp.part_type !== filters.part_type) return false
      if (filters.is_discontinued !== undefined && sp.is_discontinued !== filters.is_discontinued) return false
      if (filters.is_special_order !== undefined && sp.is_special_order !== filters.is_special_order) return false
      if (filters.is_hazardous !== undefined && sp.is_hazardous !== filters.is_hazardous) return false
      return true
    })
  }

  async searchDevices(filters: {
    brand?: string
    product_line?: string
    serial_prefix?: string
  }) {
    // Get all devices and filter in memory
    const all = await this.listDevices()
    const filtered = all.filter((d: any) => {
      if (filters.brand && d.brand !== filters.brand) return false
      if (filters.product_line && d.product_line !== filters.product_line) return false
      if (filters.serial_prefix && d.serial_number_prefix) {
        if (!d.serial_number_prefix.toLowerCase().startsWith(filters.serial_prefix.toLowerCase())) return false
      }
      return true
    })
    return filtered
  }
}

export default ProductCatalogModuleService
