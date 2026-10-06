import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { requestPath } from "./admin-access"

// Medusa's dashboard draws its sidebars from layouts the server returns, and a
// layout can mark entries hidden. For managers the server marks the entries of
// admin-only pages hidden, so those links never appear. The guard still refuses
// the pages' requests; this only keeps the dashboard free of dead ends.
// Entry ids are "core:" plus the dashboard's own entry id (Medusa 2.21).
const ADMIN_ONLY_SETTINGS = [
  "store", "users", "regions", "tax-regions", "return-reasons", "refund-reasons",
  "sales-channels", "locations", "property-labels", "translations",
  "publishable-api-keys", "secret-api-keys", "workflows", "search",
]

export const MANAGER_HIDDEN_ENTRIES: Readonly<Record<string, string[]>> = {
  // Global search can look up any record, including staff and API keys.
  "sidebar": ["core:Searchbar"],
  "settings.sidebar": ADMIN_ONLY_SETTINGS.map((page) => `core:settings-nav:/settings/${page}`),
}

type Configuration = { configuration?: { widgets?: Record<string, Record<string, unknown>> } } & Record<string, unknown>
type LayoutResponse = { personal_configuration?: Configuration | null, default_configuration?: Configuration | null } & Record<string, unknown>

function hide(configuration: Configuration | null | undefined, entries: string[]): Configuration {
  const widgets = { ...configuration?.configuration?.widgets }
  for (const entry of entries) widgets[entry] = { ...widgets[entry], hidden: true }
  return { ...configuration, configuration: { ...configuration?.configuration, widgets } }
}

// Both the personal and the default view are marked, so switching views in the
// dashboard does not bring the entries back.
export function withHiddenEntries(body: LayoutResponse, entries: string[]): LayoutResponse {
  return {
    ...body,
    default_configuration: hide(body.default_configuration, entries),
    personal_configuration: body.personal_configuration ? hide(body.personal_configuration, entries) : null,
  }
}

const LAYOUT_PATH = /^\/admin\/layouts\/([^/]+)\/configuration$/

// Runs after adminAccess, which records whether the user is a manager.
export function managerLayoutView(req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) {
  const zone = requestPath(req).match(LAYOUT_PATH)?.[1]
  const entries = zone && res.locals.staffRole === "manager" ? MANAGER_HIDDEN_ENTRIES[decodeURIComponent(zone)] : undefined
  if (!entries) return next()
  const send = res.json.bind(res)
  res.json = (body: LayoutResponse) => send(body && typeof body === "object" && "default_configuration" in body ? withHiddenEntries(body, entries) : body)
  return next()
}
