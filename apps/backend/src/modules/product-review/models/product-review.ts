import { model } from "@medusajs/framework/utils"

export const ProductReview = model.define("product_review", {
  id: model.id({ prefix: "rev" }).primaryKey(),
  product_id: model.text(),
  customer_id: model.text(),
  first_name: model.text().nullable(),
  rating: model.number(),
  title: model.text().nullable(),
  content: model.text(),
  status: model.enum(["pending", "approved", "rejected", "withdrawn"]).default("pending"),
  flags: model.json().nullable(),
  screen_version: model.number().default(1),
  version: model.number().default(1),
  moderator_id: model.text().nullable(),
  moderation_reason: model.text().nullable(),
  moderated_at: model.dateTime().nullable(),
}).checks([
  { name: "product_review_rating_range", expression: columns => `${columns.rating} >= 1 AND ${columns.rating} <= 5` },
  { name: "product_review_version_positive", expression: columns => `${columns.version} > 0` },
]).indexes([
  { on: ["customer_id", "product_id"], unique: true },
  { on: ["product_id", "status", "created_at"] },
  { on: ["product_id", "status", "rating"] },
  { on: ["status", "created_at"] },
])
