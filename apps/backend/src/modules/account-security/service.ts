import { MedusaService } from "@medusajs/framework/utils"
import { SecuritySession } from "./models/security-session"

export default class AccountSecurityService extends MedusaService({ SecuritySession }) {}
