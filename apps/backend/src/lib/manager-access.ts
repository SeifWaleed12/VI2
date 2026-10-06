import { MANAGER_AREAS } from "./manager-role"

export type StaffAction = { resource: string, operation: "read" | "create" | "update" | "delete" }

// Routes about the signed-in user's own account and view of the dashboard.
// They map to a permission every manager has, so they need no area.
const OWN = { resource: "product", operation: "read" } as const

const STOCK_SETTINGS = ["manage_inventory", "allow_backorder"] as const
export type StockSettings = Partial<Record<typeof STOCK_SETTINGS[number], unknown>>

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
  const segments = path.replace(/^\/admin\/?/, "").split("/").filter(Boolean)
  const own = ownAccountAction(method, segments, body)
  if (own !== undefined) return own
  const area = MANAGER_AREAS[segments[0]]
  if (!area || !["GET", "POST", "PUT", "DELETE"].includes(method)) return null
  if (method !== "GET" && area.access === "read") return null
  // CSV imports cannot be checked field by field. An export only reads.
  if (segments.some((segment) => segment === "import" || segment === "imports")) return null
  if (method === "POST" && segments[segments.length - 1] === "export") return { resource: area.resource, operation: "read" }
  // Linking variants to inventory items is stock management, which Odoo owns.
  if (method !== "GET" && (segments.includes("inventory-items") || bodyHas(body, (key) => key === "inventory_items"))) return null
  const operation = method === "GET" ? "read" : method === "DELETE" ? "delete" : segments.length === 1 ? "create" : "update"
  return { resource: area.resource, operation }
}

export type StockSettingsChange = { variantId: string, settings: StockSettings }

// Stock settings a request sends for variants that already exist. A new variant
// (no id) starts with the values given; an existing one must keep its own. The
// dashboard's edit form resends unchanged values, which pass the comparison.
export function existingVariantStockSettings(path: string, body: unknown): StockSettingsChange[] {
  const segments = path.replace(/^\/admin\/?/, "").split("/").filter(Boolean)
  if (!["products", "product-variants"].includes(segments[0])) return []
  const idSegment = segments[0] === "products" && segments[2] === "variants" ? segments[3]
    : segments[0] === "product-variants" ? segments[1] : undefined
  const pathVariantId = idSegment && idSegment !== "batch" ? idSegment : undefined
  const changes: StockSettingsChange[] = []
  const visit = (node: unknown, inheritedId?: string) => {
    if (Array.isArray(node)) return node.forEach((item) => visit(item))
    if (!isRecord(node)) return
    const id = typeof node.id === "string" ? node.id : inheritedId
    const settings: StockSettings = {}
    for (const key of STOCK_SETTINGS) if (key in node) settings[key] = node[key]
    if (id && Object.keys(settings).length) changes.push({ variantId: id, settings })
    for (const value of Object.values(node)) if (typeof value === "object") visit(value)
  }
  visit(body, pathVariantId)
  return changes
}
