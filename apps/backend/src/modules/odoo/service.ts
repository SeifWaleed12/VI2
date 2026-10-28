import type { OdooMove } from "../../lib/odoo-stock"

export type OdooOptions = {
  url: string
  db: string
  login: string
  apiKey: string
  // The Odoo stock.warehouse that feeds the website (plan D3); unset until known.
  warehouseId?: number
  // Units held back from every SKU (plan D4a).
  safetyStock: number
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

export type OdooWarehouseStock = {
  onHand: Map<string, number>
  moves: OdooMove[]
}

const TIMEOUT_MS = 10_000

type OdooRecord = Record<string, unknown>

function records(value: unknown, what: string): OdooRecord[] {
  if (!Array.isArray(value) || value.some((record) => typeof record !== "object" || record === null)) {
    throw new OdooError("invalid_response", `Odoo ${what} did not return a list of records.`)
  }
  return value
}

// A many2one field comes back as [id, display name], or false when empty.
function relationId(value: unknown, what: string): number {
  if (!Array.isArray(value) || typeof value[0] !== "number") throw new OdooError("invalid_response", `An Odoo ${what} is missing a linked record.`)
  return value[0]
}

function quantity(value: unknown, what: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new OdooError("invalid_response", `Odoo ${what} has no numeric quantity.`)
  return value
}

// Talks to Odoo's external API. Retries belong to the jobs and workflows that
// call it, so one slow Odoo never holds a request for more than TIMEOUT_MS.
class OdooModuleService {
  private uid?: Promise<number>
  private requestId = 0

  constructor(_container: unknown, private readonly options: OdooOptions) {}

  async call(model: string, method: string, args: unknown[] = [], kwargs: Record<string, unknown> = {}): Promise<unknown> {
    const session = this.signIn()
    const uid = await session
    try {
      return await this.rpc("object", "execute_kw", [this.options.db, uid, this.options.apiKey, model, method, args, kwargs])
    } catch (error) {
      // A revoked key or changed rights must not stay cached. Only the sign-in
      // this call used is dropped, so a late failure keeps a newer sign-in.
      if (error instanceof OdooError && error.category === "auth" && this.uid === session) this.uid = undefined
      throw error
    }
  }

  // Odoo's "Internal Reference" (default_code) is the SKU; archived products
  // are left out, as Odoo's search does by default.
  async findProductsBySku(skus: string[]): Promise<OdooProduct[]> {
    if (!skus.length) return []
    const found = records(await this.call("product.product", "search_read", [[["default_code", "in", skus]]], { fields: ["id", "default_code", "barcode"] }), "product search")
    return found.map((record) => {
      // Odoo sends false, not null, for an empty field.
      if (typeof record?.id !== "number" || typeof record.default_code !== "string" || (record.barcode !== false && typeof record.barcode !== "string")) {
        throw new OdooError("invalid_response", "Odoo returned a product without a numeric id and text SKU.")
      }
      return { id: record.id, sku: record.default_code, barcode: (record.barcode as string | false) || null }
    })
  }

  get stockSettings(): { warehouseId?: number, safetyStock: number } {
    return { warehouseId: this.options.warehouseId, safetyStock: this.options.safetyStock }
  }

  // On-hand and outgoing moves of one warehouse, by SKU. Moves are the open
  // ones (every channel) plus the done ones of the given website orders, found
  // by the Medusa order id the order push writes to client_order_ref. Each move
  // carries its sales order's client_order_ref, which is a Medusa order id only
  // for website orders. Moves are read before stock, so a delivery validated
  // between the two reads counts twice for one poll (stock reads low), never
  // not at all.
  async readWarehouseStock(warehouseId: number, websiteOrderIds: string[]): Promise<OdooWarehouseStock> {
    const [warehouse] = records(await this.call("stock.warehouse", "search_read", [[["id", "=", warehouseId]]], { fields: ["view_location_id"] }), "warehouse search")
    if (!warehouse) throw new OdooError("rejected", `Odoo warehouse ${warehouseId} was not found.`)
    const view = relationId(warehouse.view_location_id, "warehouse")

    const moves = records(await this.call("stock.move", "search_read", [[
      ["location_id", "child_of", view], ["location_dest_id.usage", "!=", "internal"],
      "|", ["state", "not in", ["draft", "done", "cancel"]],
      "&", ["state", "=", "done"], ["sale_line_id.order_id.client_order_ref", "in", websiteOrderIds],
    ]], { fields: ["product_id", "product_qty", "state", "origin", "date"] }), "stock move search")
    const quants = records(await this.call("stock.quant", "search_read", [[["location_id", "child_of", view], ["location_id.usage", "=", "internal"]]], { fields: ["product_id", "quantity"] }), "stock search")

    // Sale moves carry their sales order's name in origin.
    const origins = [...new Set(moves.map((move) => move.origin).filter((origin): origin is string => typeof origin === "string" && origin !== ""))]
    const orders = origins.length
      ? records(await this.call("sale.order", "search_read", [[["name", "in", origins]]], { fields: ["name", "client_order_ref"] }), "sales order search")
      : []
    const refByName = new Map(orders.filter((order) => typeof order.client_order_ref === "string" && order.client_order_ref).map((order) => [String(order.name), order.client_order_ref as string]))

    const productIds = [...new Set([...moves, ...quants].map((record) => relationId(record.product_id, "stock record")))]
    // Archived products can still hold stock or open moves.
    const products = productIds.length
      ? records(await this.call("product.product", "search_read", [[["id", "in", productIds]]], { fields: ["default_code"], context: { active_test: false } }), "product search")
      : []
    const skuById = new Map(products.filter((product) => typeof product.default_code === "string" && product.default_code).map((product) => [product.id, product.default_code as string]))

    // Products without an Internal Reference cannot be matched to the website and are left out.
    const onHand = new Map<string, number>()
    for (const quant of quants) {
      const sku = skuById.get(relationId(quant.product_id, "stock record"))
      if (sku) onHand.set(sku, (onHand.get(sku) ?? 0) + quantity(quant.quantity, "stock record"))
    }
    const websiteMoves: OdooMove[] = []
    for (const move of moves) {
      const sku = skuById.get(relationId(move.product_id, "stock move"))
      if (!sku) continue
      websiteMoves.push({
        sku,
        quantity: quantity(move.product_qty, "stock move"),
        open: move.state !== "done",
        orderRef: typeof move.origin === "string" ? refByName.get(move.origin) : undefined,
        // Odoo sends UTC as "YYYY-MM-DD HH:MM:SS".
        date: typeof move.date === "string" ? `${move.date.replace(" ", "T")}Z` : undefined,
      })
    }
    return { onHand, moves: websiteMoves }
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
