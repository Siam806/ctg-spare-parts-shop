import { Module } from "@medusajs/framework/utils"
import CompanyAccountModuleService from "./service"

export const COMPANY_ACCOUNT_MODULE = "companyAccount"

export default Module(COMPANY_ACCOUNT_MODULE, {
  service: CompanyAccountModuleService,
})
