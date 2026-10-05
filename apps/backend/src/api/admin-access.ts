import type { AuthenticatedMedusaRequest, MedusaResponse, MedusaNextFunction } from "@medusajs/framework/http"
import { hasPermission } from "@medusajs/framework"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

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
  return { resource: resources[match[1]], operation: method === "GET" ? "read" : path.split("/").length === 3 ? "create" : "update" }
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
  if (await hasPermission({ roles, actions: { resource: "*", operation: "*" }, container: req.scope })) return next()
  const action = managerAction(req.method, req.originalUrl.split("?")[0].replace(/\/$/, ""), req.body)
  if (!action || !await hasPermission({ roles, actions: action, container: req.scope })) {
    throw new MedusaError(MedusaError.Types.FORBIDDEN, "This action requires an administrator")
  }
  return next()
}
