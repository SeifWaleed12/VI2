import { model } from "@medusajs/framework/utils"

// One change to a customer's Vi2 Points: earned on a delivered order, removed
// by a return or by expiry. The balance is the sum, never stored separately.
// (kind, source_id) is unique, so a repeated event never counts twice.
export const PointsEntry = model.define("points_entry", {
  id: model.id({ prefix: "pts" }).primaryKey(),
  customer_id: model.text().index(),
  kind: model.enum(["earn", "return", "expire"]),
  points: model.number(),
  source_id: model.text(),
}).indexes([{ on: ["kind", "source_id"], unique: true }])
