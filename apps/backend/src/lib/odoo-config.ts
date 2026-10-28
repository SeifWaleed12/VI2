import { MedusaError } from "@medusajs/framework/utils"

const REQUIRED = ["ODOO_URL", "ODOO_DB", "ODOO_LOGIN", "ODOO_API_KEY"] as const

function wholeNumber(name: string, value: string | undefined, min: number): number | undefined {
  if (!value) return undefined
  if (!/^\d+$/.test(value) || Number(value) < min) throw new MedusaError(MedusaError.Types.INVALID_DATA, `${name} must be a whole number of at least ${min}.`)
  return Number(value)
}

// The Odoo module (docs/ODOO-INTEGRATION-PLAN.md) loads once all ODOO_*
// connection variables are set. None set leaves it out and the store runs
// without Odoo, outside production only: stock comes from Odoo, so production
// refuses to start without it or without the website's Odoo warehouse.
// Tests never reach Odoo.
export function odooModules(env: NodeJS.ProcessEnv = process.env) {
  if (env.NODE_ENV === "test") return []
  const production = env.NODE_ENV === "production"
  const values = REQUIRED.map((name) => env[name]?.trim())
  const setCount = values.filter(Boolean).length
  if (setCount === 0 && !production) return []
  if (setCount !== REQUIRED.length) throw new MedusaError(MedusaError.Types.INVALID_DATA, `Set all of ${REQUIRED.join(", ")}${production ? "" : ", or none"}.`)
  const warehouseId = wholeNumber("ODOO_WAREHOUSE_ID", env.ODOO_WAREHOUSE_ID?.trim(), 1)
  if (production && warehouseId === undefined) throw new MedusaError(MedusaError.Types.INVALID_DATA, "Set ODOO_WAREHOUSE_ID: production stock comes from that Odoo warehouse.")
  const safetyStock = wholeNumber("ODOO_SAFETY_STOCK", env.ODOO_SAFETY_STOCK?.trim(), 0) ?? 0
  const [url, db, login, apiKey] = values as string[]
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "ODOO_URL must be a full address, for example https://example.odoo.com.")
  }
  // The API key travels in every request body, so plain http is only allowed
  // where it never leaves this machine.
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname)
  if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && loopback)) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "ODOO_URL must use https:, or http: only for localhost, 127.0.0.1 or [::1].")
  }
  return [{
    resolve: "./src/modules/odoo",
    options: { url: url.replace(/\/+$/, ""), db, login, apiKey, warehouseId, safetyStock },
  }]
}
