import { Module } from "@medusajs/framework/utils"
import ShippingAddressModuleService from "./service"

export const SHIPPING_ADDRESS_MODULE = "shipping_address"

export default Module(SHIPPING_ADDRESS_MODULE, {
  service: ShippingAddressModuleService,
})
