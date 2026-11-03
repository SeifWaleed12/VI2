import { MedusaError } from "@medusajs/framework/utils"

export function requestPath(req: { originalUrl: string }) {
  const path = req.originalUrl.split("?")[0]
  // Native IDs need no URL escaping. Refuse parser differences before a guard
  // can classify a different resource from the framework route.
  if (/[#%\\\u0000-\u0020]/.test(path)) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Use an unescaped API path.")
  }
  return path.replace(/\/$/, "")
}
