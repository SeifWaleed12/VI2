import { MedusaService } from "@medusajs/framework/utils"
import { EdaRegistration } from "./models/eda-registration"

class EdaModuleService extends MedusaService({
  EdaRegistration,
}) {}

export default EdaModuleService
