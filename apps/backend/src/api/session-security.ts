import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

export function rotateLoginSession(req: MedusaRequest, _res: MedusaResponse, next: MedusaNextFunction) {
  // Keep the native handler and response; replace the anonymous session first.
  req.session.regenerate((error: unknown) => error ? next(error) : next())
}

export function protectAdminCookieWrites(req: MedusaRequest, _res: MedusaResponse, next: MedusaNextFunction) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method) || !req.session?.auth_context) return next()
  const { http } = req.scope.resolve(ContainerRegistrationKeys.CONFIG_MODULE).projectConfig
  const allowed = [http.adminCors, process.env.MEDUSA_BACKEND_URL, `${req.protocol}://${req.headers.host}`]
    .flatMap(value => String(value ?? "").split(",")).map(value => value.trim()).filter(Boolean)
  if (typeof req.headers.origin !== "string" || !allowed.includes(req.headers.origin)) {
    throw new MedusaError(MedusaError.Types.FORBIDDEN, "Admin cookie requests require a trusted origin.")
  }
  return next()
}
