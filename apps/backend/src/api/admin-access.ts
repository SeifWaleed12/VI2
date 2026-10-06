import type { AuthenticatedMedusaRequest, MedusaResponse, MedusaNextFunction } from "@medusajs/framework/http"
import { hasPermission } from "@medusajs/framework"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

// RD v1.1 section 2.2: a catalog manager may create draft products and edit
// images/content, but not pricing, discounts, stock, or publishing. Product
// payloads can carry prices, inventory links, and status at any depth.
// A new product may only be created as a draft. On an existing product any
// status change is a publish or unpublish, so status is never allowed there.
function touchesRestrictedProductFields(body: unknown, isCreate: boolean): boolean {
  if (Array.isArray(body)) return body.some((item) => touchesRestrictedProductFields(item, isCreate))
  if (!body || typeof body !== "object") return false
  return Object.entries(body).some(([key, value]) =>
    key === "prices" || key === "inventory_items" ||
    (key === "status" && !(isCreate && value === "draft")) ||
    touchesRestrictedProductFields(value, isCreate))
}

// Explicit catalog endpoints prevent unrelated and future admin APIs from
// becoming accessible to a catalog manager merely because they lack policies.
export function managerAction(method: string, path: string, body?: unknown) {
  if (method === "DELETE") return null
  if (body && typeof body === "object" && Object.entries(body).some(([key, value]) =>
    (key === "delete" || key === "remove") && Array.isArray(value) && value.length > 0)) return null
  if (method === "GET" && (path === "/admin/users/me" || path === "/admin/rbac/me/permissions")) return { resource: "product", operation: "read" }
  const match = path.match(/^\/admin\/(products|product-variants|product-categories|product-collections|product-types|product-tags|brands)(?:\/[^/]+)?(?:\/(variants|options)(?:\/[^/]+)?|\/quick-variant)?$/)
  if (!match || !["GET", "POST", "PUT"].includes(method)) return null
  const resources: Record<string, string> = {
    products: "product", "product-variants": "product_variant", "product-categories": "product_category",
    "product-collections": "product_collection", "product-types": "product_type", "product-tags": "product_tag", brands: "brand",
  }
  // Bulk/import/export endpoints can conceal deletion or bypass scoped checks.
  if (/\/(batch|import|export)$/.test(path)) return null
  // Brand status is catalog visibility, not product publishing; it is not
  // covered by the matrix, so brands keep their existing behavior.
  const isCreate = path.split("/").length === 3
  if (method !== "GET" && match[1] !== "brands" && touchesRestrictedProductFields(body, isCreate)) return null
  return { resource: resources[match[1]], operation: method === "GET" ? "read" : isCreate ? "create" : "update" }
}

type Middleware = (req: AuthenticatedMedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => unknown

function requestPath(req: { originalUrl: string }) {
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

export async function adminAccess(req: AuthenticatedMedusaRequest, _res: MedusaResponse, next: MedusaNextFunction) {
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
  if (await hasPermission({ roles, actions: { resource: "*", operation: "*" }, container: req.scope })) return next()
  const action = managerAction(req.method, requestPath(req), req.body)
  if (!action || !await hasPermission({ roles, actions: action, container: req.scope })) {
    throw new MedusaError(MedusaError.Types.FORBIDDEN, "This action requires an administrator")
  }
  return next()
}
