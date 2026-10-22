import { MedusaService } from "@medusajs/framework/utils"
import { PointsEntry } from "./models/points-entry"

class LoyaltyModuleService extends MedusaService({
  PointsEntry,
}) {}

export default LoyaltyModuleService
