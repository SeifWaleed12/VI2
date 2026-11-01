import { MANAGER_AREAS } from "./manager-role"

export type StaffAction = { resource: string, operation: "read" | "create" | "update" | "delete" }

// Routes about the signed-in user's own account and view of the dashboard.
// They map to a permission every manager has, so they need no area.
const OWN = { resource: "product", operation: "read" } as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

function bodyHas(body: unknown, predicate: (key: string, value: unknown) => boolean): boolean {
  if (Array.isArray(body)) return body.some((item) => bodyHas(item, predicate))
  if (!isRecord(body)) return false
  return Object.entries(body).some(([key, value]) => predicate(key, value) || bodyHas(value, predicate))
}

function ownAccountAction(method: string, segments: string[], body: unknown): StaffAction | null | undefined {
  const path = segments.join("/")
  if (method === "GET" && ["users/me", "rbac/me/permissions", "feature-flags", "layouts/configurations"].includes(path)) return OWN
  if (method === "POST" && path === "users/me/password") return OWN
  if (segments[0] === "layouts" && segments.length === 3 && segments[2] === "configuration") {
    if (method === "GET" || method === "DELETE") return OWN
    // Saving a layout "for everyone" changes every admin's dashboard.
    if (method === "POST") return isRecord(body) && body.is_default === true ? null : OWN
  }
  // Saved table views: managers may use them but not change them, because an
  // update by id can target the view shared by everyone.
  if (segments[0] === "views") return method === "GET" ? OWN : null
  return undefined
}

// Decides which permission a manager's request needs, or null when the request
// is admin only. Everything not explicitly listed is admin only, so admin APIs
// Medusa adds later, and our own future business pages, stay closed by default.
export function managerAction(method: string, path: string, body?: unknown): StaffAction | null {
  const segments = path.replace(/^\/admin\/?/i, "").split("/").filter(Boolean).map(segment => segment.toLowerCase())
  const own = ownAccountAction(method, segments, body)
  if (own !== undefined) return own
  // Review moderation is a catalog task; reuse existing product grants without adding a role.
  if (segments[0] === "product-reviews") {
    if (method === "GET" && segments.length === 1) return OWN
    if (method === "POST" && segments.length === 2) return { resource: "product", operation: "update" }
    return null
  }
  const area = MANAGER_AREAS[segments[0]]
  if (!area || !["GET", "POST", "PUT", "DELETE"].includes(method)) return null
  // Medusa starts an export with POST, but an export only reads, so it is
  // allowed in view-only areas too (for example inventory).
  if (method === "POST" && segments.length === 2 && segments[1] === "export") return { resource: area.resource, operation: "read" }
  // Holding stock for an order line ("Allocate items") is part of fulfilling an
  // order; manager-request-checks.ts limits it to what the line needs.
  if (method === "POST" && segments.length === 1 && segments[0] === "reservations" && isRecord(body) && typeof body.line_item_id === "string") {
    return { resource: "reservation_item", operation: "create" }
  }
  if (method !== "GET" && area.access === "read") return null
  // Managers own product catalog/stock imports; every other area's imports
  // remain admin-only, as do unlisted product-import actions.
  if (method === "POST" && segments[0] === "products" && segments[1] === "imports"
    && (segments.length === 2 || (segments.length === 4 && segments[3] === "confirm"))) {
    return { resource: "product", operation: "create" }
  }
  if (segments.some((segment) => segment === "import" || segment === "imports")) return null
  // Linking variants to inventory items is stock management, which Odoo owns.
  // The dashboard's create form sends an empty list for every variant; only
  // listed items are links.
  const linksInventory = (key: string, value: unknown) => key === "inventory_items" && !(Array.isArray(value) && value.length === 0)
  if (method !== "GET" && (segments.includes("inventory-items") || bodyHas(body, linksInventory))) return null
  const operation = method === "GET" ? "read" : method === "DELETE" ? "delete" : segments.length === 1 ? "create" : "update"
  return { resource: area.resource, operation }
}
