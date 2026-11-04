import type { AuthenticatedMedusaRequest, MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { bindSecuritySession, requireSecuritySession } from "../lib/security-session"

export async function activeSecuritySession(req: AuthenticatedMedusaRequest, _res: MedusaResponse, next: MedusaNextFunction) {
  if (req.auth_context?.auth_identity_id) await requireSecuritySession(req.scope, req.auth_context)
  return next()
}

type NativeHandler<Req, Res> = (req: Req, res: Res) => Promise<unknown>
export async function sessionBoundResponse<Req extends MedusaRequest<any, any>, Res extends MedusaResponse<any>>(req: Req, res: Res, handler: NativeHandler<Req, Res>, reuseSession = false) {
  const send = res.json.bind(res)
  let payload: unknown
  res.json = (body: unknown) => { payload = body; return res }
  try { await handler(req, res) } finally { res.json = send }
  if (payload && typeof payload === "object" && "token" in payload && typeof payload.token === "string") {
    const token = await bindSecuritySession(req.scope, payload.token, reuseSession && "auth_context" in req ? req.auth_context as AuthenticatedMedusaRequest["auth_context"] : undefined)
    return send({ ...payload, token })
  }
  return send(payload)
}
