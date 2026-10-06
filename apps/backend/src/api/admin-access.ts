import type { AuthenticatedMedusaRequest, MedusaResponse, MedusaNextFunction } from "@medusajs/framework/http"
import { hasPermission } from "@medusajs/framework"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { existingVariantStockSettings, managerAction, type StockSettingsChange } from "../lib/manager-access"

type Middleware = (req: AuthenticatedMedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => unknown
type Scope = AuthenticatedMedusaRequest["scope"]

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

// True when the request would change the stock settings of a variant that
// already exists. Stock comes from Odoo, so only an administrator may do that.
async function changesStockSettings(scope: Scope, changes: StockSettingsChange[]) {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product_variant",
    fields: ["id", "manage_inventory", "allow_backorder"],
    filters: { id: [...new Set(changes.map((change) => change.variantId))] },
  })
  const stored = new Map((data as Record<string, unknown>[]).map((variant) => [variant.id, variant]))
  // An unknown id is left to Medusa, which rejects the update itself.
  return changes.some(({ variantId, settings }) => {
    const variant = stored.get(variantId)
    return !!variant && Object.entries(settings).some(([key, value]) => variant[key] !== value)
  })
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
  const stockChanges = req.method === "GET" ? [] : existingVariantStockSettings(path, req.body)
  if (stockChanges.length && await changesStockSettings(req.scope, stockChanges)) {
    throw new MedusaError(MedusaError.Types.FORBIDDEN, "Stock settings can only be changed by an administrator")
  }
  res.locals.staffRole = "manager" satisfies StaffRole
  return next()
}
