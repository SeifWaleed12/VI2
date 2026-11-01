import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import SecureEmailpassService from "./service"

export default ModuleProvider(Modules.AUTH, { services: [SecureEmailpassService] })
