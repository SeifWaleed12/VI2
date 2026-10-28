export type OdooOptions = {
  url: string
  db: string
  login: string
  apiKey: string
}

// unreachable: network, timeout, rate limit or Odoo down; safe to retry later.
// auth: wrong key or login, or the Odoo user lacks rights; retrying will not help.
// rejected: Odoo refused the request itself (validation, missing record).
// invalid_response: the answer was not what Odoo's API returns.
export type OdooErrorCategory = "unreachable" | "auth" | "rejected" | "invalid_response"

// Callers decide what to retry. The message is for server logs only, never for
// customers.
export class OdooError extends Error {
  constructor(readonly category: OdooErrorCategory, message: string) {
    super(message)
    this.name = "OdooError"
  }
}

export type OdooProduct = {
  id: number
  sku: string
  barcode: string | null
}

const TIMEOUT_MS = 10_000

// Talks to Odoo's external API. Retries belong to the jobs and workflows that
// call it, so one slow Odoo never holds a request for more than TIMEOUT_MS.
class OdooModuleService {
  private uid?: Promise<number>
  private requestId = 0

  constructor(_container: unknown, private readonly options: OdooOptions) {}

  async call(model: string, method: string, args: unknown[] = [], kwargs: Record<string, unknown> = {}): Promise<unknown> {
    const uid = await this.signIn()
    try {
      return await this.rpc("object", "execute_kw", [this.options.db, uid, this.options.apiKey, model, method, args, kwargs])
    } catch (error) {
      // A revoked key or changed rights must not stay cached.
      if (error instanceof OdooError && error.category === "auth") this.uid = undefined
      throw error
    }
  }

  // Odoo's "Internal Reference" (default_code) is the SKU; archived products
  // are left out, as Odoo's search does by default.
  async findProductsBySku(skus: string[]): Promise<OdooProduct[]> {
    if (!skus.length) return []
    const records = await this.call("product.product", "search_read", [[["default_code", "in", skus]]], { fields: ["id", "default_code", "barcode"] })
    if (!Array.isArray(records)) throw new OdooError("invalid_response", "Odoo product search did not return a list.")
    return records.map((record) => {
      // Odoo sends false, not null, for an empty field.
      if (typeof record?.id !== "number" || typeof record.default_code !== "string" || (record.barcode !== false && typeof record.barcode !== "string")) {
        throw new OdooError("invalid_response", "Odoo returned a product without a numeric id and text SKU.")
      }
      return { id: record.id, sku: record.default_code, barcode: record.barcode || null }
    })
  }

  private signIn(): Promise<number> {
    this.uid ??= this.authenticate().catch((error) => {
      this.uid = undefined
      throw error
    })
    return this.uid
  }

  private async authenticate(): Promise<number> {
    const uid = await this.rpc("common", "authenticate", [this.options.db, this.options.login, this.options.apiKey, {}])
    if (typeof uid !== "number") throw new OdooError("auth", "Odoo refused the configured login and API key.")
    return uid
  }

  // shortcut: JSON-RPC (/jsonrpc) is deprecated in Odoo 19 and removed in Odoo 22;
  // move this method to the JSON-2 API before O-2 merges if the Odoo version (plan D1) is 19 or newer.
  private async rpc(service: string, method: string, args: unknown[]): Promise<unknown> {
    let response: Response
    try {
      response = await fetch(`${this.options.url}/jsonrpc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", method: "call", params: { service, method, args }, id: ++this.requestId }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
    } catch (error) {
      throw new OdooError("unreachable", `Odoo did not answer: ${(error as Error).message}`)
    }
    if (!response.ok) {
      const retryable = response.status === 429 || response.status >= 500
      throw new OdooError(retryable ? "unreachable" : "invalid_response", `Odoo answered HTTP ${response.status}.`)
    }
    let body: { result?: unknown, error?: { message?: string, data?: { name?: string, message?: string } } }
    try {
      body = await response.json()
    } catch (error) {
      // The same timeout covers reading the body.
      if ((error as Error).name === "TimeoutError" || (error as Error).name === "AbortError") throw new OdooError("unreachable", "Odoo did not finish answering.")
      throw new OdooError("invalid_response", "Odoo did not answer with JSON.")
    }
    if (body?.error) {
      const name = body.error.data?.name ?? ""
      throw new OdooError(/Access(Denied|Error)/.test(name) ? "auth" : "rejected", body.error.data?.message || body.error.message || "Odoo refused the request.")
    }
    if (!body || typeof body !== "object" || !("result" in body)) throw new OdooError("invalid_response", "Odoo's answer had no result.")
    return body.result
  }
}

export default OdooModuleService
