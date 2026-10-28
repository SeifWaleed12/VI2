import { MedusaError } from "@medusajs/framework/utils"

const REQUIRED = ["ODOO_URL", "ODOO_DB", "ODOO_LOGIN", "ODOO_API_KEY"] as const

// The Odoo module (docs/ODOO-INTEGRATION-PLAN.md) loads once all ODOO_*
// variables are set. None set leaves it out and the store runs without Odoo.
// Tests never reach Odoo.
// shortcut: production also starts without Odoo; once stock comes from Odoo
// (task O-2), production must refuse to start without it, as fileModules does.
export function odooModules(env: NodeJS.ProcessEnv = process.env) {
  if (env.NODE_ENV === "test") return []
  const values = REQUIRED.map((name) => env[name]?.trim())
  const setCount = values.filter(Boolean).length
  if (setCount === 0) return []
  if (setCount !== REQUIRED.length) throw new MedusaError(MedusaError.Types.INVALID_DATA, `Set all of ${REQUIRED.join(", ")}, or none.`)
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
    options: { url: url.replace(/\/+$/, ""), db, login, apiKey },
  }]
}
