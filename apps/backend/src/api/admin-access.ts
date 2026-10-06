import type { AuthenticatedMedusaRequest, MedusaResponse, MedusaNextFunction } from "@medusajs/framework/http"
import { hasPermission } from "@medusajs/framework"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { managerAction } from "../lib/manager-access"
import { checkManagerRequest } from "./manager-request-checks"

type Middleware = (req: AuthenticatedMedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => unknown

export type StaffRole = "admin" | "manager"

export function requestPath(req: { originalUrl: string }) {
  return req.originalUrl.split("?")[0].replace(/\/$/, "")
}

// Invite acceptance is performed by a not-yet-registered identity. Medusa's own
// route middleware authenticates it with allowUnregistered, so the global admin
// guard must not reject it for lacking an actor.
export function unlessInviteAcceptance(middleware: Middleware): Middleware {
  return (req, res, next) =>
    req.method === "POST" && requestPath(req) === "/admin/invites/accept"
      ? next()
      : middleware(req, res, next)
}

export async function adminAccess(req: AuthenticatedMedusaRequest, res: MedusaResponse, next: MedusaNextFunction) {
  if (!req.auth_context?.actor_id || req.auth_context.actor_type !== "user") {
    throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Admin authentication required")
  }
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: users } = await query.graph({ entity: "user", fields: ["id", "rbac_roles.id"], filters: { id: req.auth_context.actor_id } })
  const user = users[0] as { rbac_roles?: { id: string }[] } | undefined
  const roles = user?.rbac_roles?.map((role) => role.id) || []
  // Read assignments from the database so revoked roles do not retain access
  // for the remaining JWT lifetime.
  req.auth_context.app_metadata = { ...req.auth_context.app_metadata, roles }
  // Medusa's hasPermission grants everything to an empty role list, so a staff
  // user with no role (never assigned, or the last one revoked) is denied here.
  if (!roles.length) {
    throw new MedusaError(MedusaError.Types.FORBIDDEN, "This action requires an assigned role")
  }
  if (await hasPermission({ roles, actions: { resource: "*", operation: "*" }, container: req.scope })) {
    res.locals.staffRole = "admin" satisfies StaffRole
    return next()
  }
  const path = requestPath(req)
  const action = managerAction(req.method, path, req.body)
  if (!action || !await hasPermission({ roles, actions: action, container: req.scope })) {
    throw new MedusaError(MedusaError.Types.FORBIDDEN, "This action requires an administrator")
  }
  await checkManagerRequest(req.scope, req.method, path, req.body)
  res.locals.staffRole = "manager" satisfies StaffRole
  return next()
}
