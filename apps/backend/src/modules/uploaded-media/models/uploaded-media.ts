import { model } from "@medusajs/framework/utils"

// A product image this server uploaded, so a nightly job can delete it once no
// product uses it. `id` is the file's id in the file module (its bucket key).
export const UploadedMedia = model.define("uploaded_media", {
  id: model.text().primaryKey(),
  url: model.text(),
}).indexes([{ name: "IDX_uploaded_media_created_at", on: ["created_at"] }])
