import { Module } from "@medusajs/framework/utils"
import CustomerAddressModuleService from "./service"

export const CUSTOMER_ADDRESS_MODULE = "customer_address"

export default Module(CUSTOMER_ADDRESS_MODULE, {
  service: CustomerAddressModuleService,
})
