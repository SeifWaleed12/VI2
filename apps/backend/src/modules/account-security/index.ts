import { Module } from "@medusajs/framework/utils"
import AccountSecurityService from "./service"

export const ACCOUNT_SECURITY_MODULE = "accountSecurity"
export default Module(ACCOUNT_SECURITY_MODULE, { service: AccountSecurityService })
