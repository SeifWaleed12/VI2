import { model } from "@medusajs/framework/utils"

export const Brand = model.define("brand", {
  id: model.id().primaryKey(),
  name: model.text(),
  slug: model.text().unique(),
  description: model.text().nullable(),
  logo: model.text().nullable(),
  country: model.text().nullable(),
  status: model.text().default("active"),
})
