import { model } from "@medusajs/framework/utils"

export const SecuritySession = model.define("security_session", {
  id: model.id().primaryKey(),
  auth_identity_id: model.text(),
  credential_stamp: model.text(),
  expires_at: model.dateTime(),
  revoked: model.boolean().default(false),
}).indexes([{ name: "IDX_security_session_expiry", on: ["expires_at"] }])
