import { model } from "@medusajs/framework/utils"

export const Brand = model.define("brand", {
  id: model.id().primaryKey(),
  name: model.text(),
  slug: model.text().unique(),
  description: model.text().nullable(),
  // The uploaded logo's public address, and its file id in storage so a
  // replaced or removed logo's file can be deleted (api/admin/brands/[id]/logo).
  logo: model.text().nullable(),
  logo_file_id: model.text().nullable(),
  country: model.text().nullable(),
  status: model.text().default("active"),
})
