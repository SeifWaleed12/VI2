import { model } from "@medusajs/framework/utils"

// A product's registration with Egypt's Drug Authority. Owner decision
// (2026-10-09): only the number and whether it is approved are recorded; the
// storefront shows them and approval does not block selling.
export const EdaRegistration = model.define("eda_registration", {
  id: model.id({ prefix: "eda" }).primaryKey(),
  registration_number: model.text(),
  is_approved: model.boolean().default(false),
})
