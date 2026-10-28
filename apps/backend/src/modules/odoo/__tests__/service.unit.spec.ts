import OdooModuleService, { OdooError } from "../service"

const options = { url: "https://odoo.example.com", db: "vi2", login: "sync@example.com", apiKey: "key", safetyStock: 0 }

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })
const result = (value: unknown) => json({ jsonrpc: "2.0", id: 1, result: value })
const odooError = (name: string, message: string) => json({ jsonrpc: "2.0", id: 1, error: { code: 200, message: "Odoo Server Error", data: { name, message } } })

let fetchMock: jest.SpyInstance

beforeEach(() => {
  fetchMock = jest.spyOn(global, "fetch")
})

afterEach(() => {
  fetchMock.mockRestore()
})

const sentBody = (call: number) => JSON.parse(fetchMock.mock.calls[call][1].body)

async function category(promise: Promise<unknown>) {
  const error = await promise.catch((caught) => caught)
  expect(error).toBeInstanceOf(OdooError)
  return (error as OdooError).category
}

it("signs in once, then looks products up by SKU with a timeout", async () => {
  fetchMock
    .mockResolvedValueOnce(result(7))
    .mockResolvedValueOnce(result([{ id: 11, default_code: "WHEY-1KG", barcode: "6221000000017" }, { id: 12, default_code: "CREA-300", barcode: false }]))
    .mockResolvedValueOnce(result([]))
  const odoo = new OdooModuleService({}, options)

  await expect(odoo.findProductsBySku(["WHEY-1KG", "CREA-300"])).resolves.toEqual([
    { id: 11, sku: "WHEY-1KG", barcode: "6221000000017" },
    { id: 12, sku: "CREA-300", barcode: null },
  ])
  await odoo.findProductsBySku(["OTHER"])

  expect(fetchMock).toHaveBeenCalledTimes(3)
  expect(fetchMock.mock.calls[0][0]).toBe("https://odoo.example.com/jsonrpc")
  expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal)
  expect(sentBody(0).params).toEqual({ service: "common", method: "authenticate", args: ["vi2", "sync@example.com", "key", {}] })
  expect(sentBody(1).params).toEqual({
    service: "object",
    method: "execute_kw",
    args: ["vi2", 7, "key", "product.product", "search_read", [[["default_code", "in", ["WHEY-1KG", "CREA-300"]]]], { fields: ["id", "default_code", "barcode"] }],
  })
  expect(sentBody(2).params.args[1]).toBe(7)
})

it("sends nothing for an empty SKU list", async () => {
  await expect(new OdooModuleService({}, options).findProductsBySku([])).resolves.toEqual([])
  expect(fetchMock).not.toHaveBeenCalled()
})

it("reports a refused login and tries again on the next call", async () => {
  fetchMock.mockResolvedValueOnce(result(false)).mockResolvedValueOnce(result(7)).mockResolvedValueOnce(result([]))
  const odoo = new OdooModuleService({}, options)

  expect(await category(odoo.findProductsBySku(["A"]))).toBe("auth")
  await expect(odoo.findProductsBySku(["A"])).resolves.toEqual([])
  expect(sentBody(1).params.method).toBe("authenticate")
})

it("signs in again after Odoo denies access to a call", async () => {
  fetchMock
    .mockResolvedValueOnce(result(7))
    .mockResolvedValueOnce(odooError("odoo.exceptions.AccessError", "Not allowed"))
    .mockResolvedValueOnce(result(8))
    .mockResolvedValueOnce(result([]))
  const odoo = new OdooModuleService({}, options)

  expect(await category(odoo.call("product.product", "search_read"))).toBe("auth")
  await odoo.call("product.product", "search_read")
  expect(sentBody(2).params.method).toBe("authenticate")
  expect(sentBody(3).params.args[1]).toBe(8)
})

it("shares one sign-in between calls made at the same time", async () => {
  fetchMock.mockResolvedValueOnce(result(7)).mockResolvedValueOnce(result(1)).mockResolvedValueOnce(result(2))
  const odoo = new OdooModuleService({}, options)

  await Promise.all([odoo.call("res.partner", "search_count"), odoo.call("res.partner", "search_count")])
  expect(fetchMock).toHaveBeenCalledTimes(3)
  expect(sentBody(0).params.method).toBe("authenticate")
  expect([sentBody(1).params.args[1], sentBody(2).params.args[1]]).toEqual([7, 7])
})

it("keeps a newer sign-in when an older call fails with an auth error later", async () => {
  let releaseOlder!: (response: Response) => void
  fetchMock
    .mockResolvedValueOnce(result(7))
    .mockResolvedValueOnce(odooError("odoo.exceptions.AccessDenied", "Session expired"))
    .mockReturnValueOnce(new Promise<Response>((resolve) => { releaseOlder = resolve }))
    .mockResolvedValueOnce(result(8))
    .mockResolvedValueOnce(result([]))
    .mockResolvedValueOnce(result([]))
  const odoo = new OdooModuleService({}, options)

  const first = odoo.call("res.partner", "search")
  const older = odoo.call("res.partner", "search")
  expect(await category(first)).toBe("auth")
  await odoo.call("res.partner", "search")
  expect(sentBody(3).params.method).toBe("authenticate")

  releaseOlder(odooError("odoo.exceptions.AccessDenied", "Session expired"))
  expect(await category(older)).toBe("auth")
  await odoo.call("res.partner", "search")
  expect(fetchMock).toHaveBeenCalledTimes(6)
  expect(sentBody(5).params.args[1]).toBe(8)
})

it("keeps the sign-in after Odoo rejects a request", async () => {
  fetchMock
    .mockResolvedValueOnce(result(7))
    .mockResolvedValueOnce(odooError("odoo.exceptions.ValidationError", "Missing field"))
    .mockResolvedValueOnce(result(true))
  const odoo = new OdooModuleService({}, options)

  expect(await category(odoo.call("sale.order", "create", [{}]))).toBe("rejected")
  await odoo.call("sale.order", "action_confirm", [[1]])
  expect(fetchMock).toHaveBeenCalledTimes(3)
})

it("treats network failures, timeouts, rate limits and server errors as unreachable", async () => {
  const odoo = new OdooModuleService({}, options)
  fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"))
  expect(await category(odoo.call("res.partner", "search"))).toBe("unreachable")
  fetchMock.mockRejectedValueOnce(new DOMException("timed out", "TimeoutError"))
  expect(await category(odoo.call("res.partner", "search"))).toBe("unreachable")
  fetchMock.mockResolvedValueOnce(json({}, 429))
  expect(await category(odoo.call("res.partner", "search"))).toBe("unreachable")
  fetchMock.mockResolvedValueOnce(json({}, 502))
  expect(await category(odoo.call("res.partner", "search"))).toBe("unreachable")
})

it("rejects answers that are not Odoo's API", async () => {
  const odoo = new OdooModuleService({}, options)
  fetchMock.mockResolvedValueOnce(json({}, 404))
  expect(await category(odoo.call("res.partner", "search"))).toBe("invalid_response")
  fetchMock.mockResolvedValueOnce(new Response("<html>login</html>", { status: 200 }))
  expect(await category(odoo.call("res.partner", "search"))).toBe("invalid_response")
  fetchMock.mockResolvedValueOnce(json({ jsonrpc: "2.0", id: 1 }))
  expect(await category(odoo.call("res.partner", "search"))).toBe("invalid_response")

  fetchMock.mockResolvedValueOnce(result(7)).mockResolvedValueOnce(result({ id: 1 }))
  expect(await category(odoo.findProductsBySku(["A"]))).toBe("invalid_response")
  fetchMock.mockResolvedValueOnce(result([{ id: "1", default_code: "A", barcode: false }]))
  expect(await category(odoo.findProductsBySku(["A"]))).toBe("invalid_response")
})

it("reads a warehouse's on-hand and outgoing moves by SKU", async () => {
  fetchMock
    .mockResolvedValueOnce(result(7))
    .mockResolvedValueOnce(result([{ id: 3, view_location_id: [11, "WH"] }]))
    .mockResolvedValueOnce(result([
      { id: 1, product_id: [21, "Whey"], product_qty: 3, state: "assigned", origin: "S00042", date: "2026-10-25 08:30:00" },
      { id: 2, product_id: [21, "Whey"], product_qty: 1, state: "done", origin: "S00042", date: "2026-10-24 08:30:00" },
      { id: 3, product_id: [22, "Creatine"], product_qty: 2, state: "confirmed", origin: "POS/0007", date: "2026-10-26 08:30:00" },
      { id: 4, product_id: [23, "Shaker"], product_qty: 5, state: "confirmed", origin: false, date: "2026-10-26 08:30:00" },
    ]))
    .mockResolvedValueOnce(result([
      { id: 31, product_id: [21, "Whey"], quantity: 6 },
      { id: 32, product_id: [21, "Whey"], quantity: 4.5 },
      { id: 33, product_id: [22, "Creatine"], quantity: 8 },
      { id: 34, product_id: [23, "Shaker"], quantity: 2 },
    ]))
    .mockResolvedValueOnce(result([{ id: 42, name: "S00042", client_order_ref: "order_A" }]))
    .mockResolvedValueOnce(result([{ id: 21, default_code: "WHEY" }, { id: 22, default_code: "CREA" }, { id: 23, default_code: false }]))

  const stock = await new OdooModuleService({}, options).readWarehouseStock(3, ["order_A"])

  expect(stock.onHand).toEqual(new Map([["WHEY", 10.5], ["CREA", 8]]))
  expect(stock.moves).toEqual([
    { sku: "WHEY", quantity: 3, open: true, orderRef: "order_A", date: "2026-10-25T08:30:00Z" },
    { sku: "WHEY", quantity: 1, open: false, orderRef: "order_A", date: "2026-10-24T08:30:00Z" },
    { sku: "CREA", quantity: 2, open: true, orderRef: undefined, date: "2026-10-26T08:30:00Z" },
  ])
  const [, , , moveModel, , moveDomain] = sentBody(2).params.args
  expect(moveModel).toBe("stock.move")
  expect(moveDomain[0]).toEqual([
    ["location_id", "child_of", 11],
    // Leaving the warehouse (customer, transit, another warehouse's stock), not a pick or pack step inside it.
    "|", ["location_dest_id.usage", "!=", "internal"], "!", ["location_dest_id", "child_of", 11],
    "|", ["state", "not in", ["draft", "done", "cancel"]],
    "&", ["state", "=", "done"], ["sale_line_id.order_id.client_order_ref", "in", ["order_A"]],
  ])
  expect(sentBody(3).params.args.slice(3, 6)).toEqual(["stock.quant", "search_read", [[["location_id", "child_of", 11], ["location_id.usage", "=", "internal"]]]])
  expect(sentBody(4).params.args[5]).toEqual([[["name", "in", ["S00042", "POS/0007"]]]])
  expect(sentBody(5).params.args[6]).toEqual({ fields: ["default_code"], context: { active_test: false } })
})

it("refuses a warehouse Odoo does not have, and records without a product", async () => {
  fetchMock.mockResolvedValueOnce(result(7)).mockResolvedValueOnce(result([]))
  const odoo = new OdooModuleService({}, options)
  expect(await category(odoo.readWarehouseStock(99, []))).toBe("rejected")

  fetchMock
    .mockResolvedValueOnce(result([{ id: 3, view_location_id: [11, "WH"] }]))
    .mockResolvedValueOnce(result([{ id: 1, product_id: false, product_qty: 1, state: "assigned", origin: false, date: false }]))
    .mockResolvedValueOnce(result([]))
  expect(await category(odoo.readWarehouseStock(3, []))).toBe("invalid_response")
})

const sent = (call: number) => sentBody(call).params.args.slice(3)

it("reuses the lowest-id contact with the email and reports the others", async () => {
  fetchMock.mockResolvedValueOnce(result(7)).mockResolvedValueOnce(result([5, 9]))
  expect(await new OdooModuleService({}, options).upsertContact({ email: " Sara@Example.com ", name: "Sara" })).toEqual({ id: 5, duplicates: [9] })
  expect(sent(1)).toEqual(["res.partner", "search", [[["email_normalized", "=", "sara@example.com"]]], { order: "id" }])
  expect(fetchMock).toHaveBeenCalledTimes(2)
})

it("creates a contact tagged Website, creating the tag the first time", async () => {
  fetchMock.mockResolvedValueOnce(result(7)).mockResolvedValueOnce(result([])).mockResolvedValueOnce(result([])).mockResolvedValueOnce(result(4)).mockResolvedValueOnce(result(12))
  expect(await new OdooModuleService({}, options).upsertContact({ email: "sara@example.com", name: "Sara Ali", phone: "" })).toEqual({ id: 12, duplicates: [] })
  expect(sent(2)).toEqual(["res.partner.category", "search", [[["name", "=", "Website"]]], { order: "id" }])
  expect(sent(3)).toEqual(["res.partner.category", "create", [{ name: "Website" }], {}])
  expect(sent(4)).toEqual(["res.partner", "create", [{ name: "Sara Ali", email: "sara@example.com", phone: false, category_id: [[4, 4]] }], {}])
})

it("finds the contact's website lead, lost ones included, or creates it", async () => {
  fetchMock.mockResolvedValueOnce(result(7)).mockResolvedValueOnce(result([3])).mockResolvedValueOnce(result([40]))
  const odoo = new OdooModuleService({}, options)
  expect(await odoo.upsertLead(12, "Sara")).toBe(40)
  expect(sent(2)).toEqual(["crm.lead", "search", [[["partner_id", "=", 12], ["source_id", "=", 3]]], { order: "id", context: { active_test: false } }])

  fetchMock.mockResolvedValueOnce(result([3])).mockResolvedValueOnce(result([])).mockResolvedValueOnce(result(41))
  expect(await odoo.upsertLead(12, "Sara")).toBe(41)
  expect(sent(5)).toEqual(["crm.lead", "create", [{ name: "Sara", partner_id: 12, source_id: 3 }], {}])
})

it("returns the existing sales order for a Medusa order without creating another", async () => {
  fetchMock.mockResolvedValueOnce(result(7)).mockResolvedValueOnce(result([{ id: 90, state: "sale" }]))
  expect(await new OdooModuleService({}, options).upsertSaleOrder("order_1", 12, [{ sku: "WHEY", quantity: 1, unitPrice: 10 }])).toEqual({ id: 90, state: "sale" })
  expect(sent(1)).toEqual(["sale.order", "search_read", [[["client_order_ref", "=", "order_1"]]], { fields: ["state"], order: "id", limit: 1 }])
  expect(fetchMock).toHaveBeenCalledTimes(2)
})

it("creates a quotation with Medusa's prices and no tax", async () => {
  fetchMock
    .mockResolvedValueOnce(result(7))
    .mockResolvedValueOnce(result([]))
    .mockResolvedValueOnce(result([{ id: 21, default_code: "WHEY", barcode: false }, { id: 30, default_code: "WEB-DISCOUNT", barcode: false }]))
    .mockResolvedValueOnce(result(91))
  const lines = [{ sku: "WHEY", quantity: 2, unitPrice: 1500 }, { sku: "WEB-DISCOUNT", quantity: 1, unitPrice: -150 }]
  expect(await new OdooModuleService({}, options).upsertSaleOrder("order_1", 12, lines, 13)).toEqual({ id: 91, state: "draft" })
  expect(sent(3)).toEqual(["sale.order", "create", [{
    partner_id: 12,
    partner_shipping_id: 13,
    client_order_ref: "order_1",
    order_line: [
      [0, 0, { product_id: 21, product_uom_qty: 2, price_unit: 1500, tax_id: [[6, 0, []]] }],
      [0, 0, { product_id: 30, product_uom_qty: 1, price_unit: -150, tax_id: [[6, 0, []]] }],
    ],
  }], {}])
})

it("refuses an order whose SKU Odoo does not have, creating nothing", async () => {
  fetchMock.mockResolvedValueOnce(result(7)).mockResolvedValueOnce(result([])).mockResolvedValueOnce(result([{ id: 21, default_code: "WHEY", barcode: false }]))
  const error = await new OdooModuleService({}, options).upsertSaleOrder("order_1", 12, [{ sku: "WHEY", quantity: 1, unitPrice: 10 }, { sku: "WEB-SHIPPING", quantity: 1, unitPrice: 60 }]).catch((caught) => caught)
  expect(error).toEqual(new OdooError("rejected", "Odoo has no active product with Internal Reference WEB-SHIPPING."))
  expect(fetchMock).toHaveBeenCalledTimes(3)
})

it("confirms a sales order, and treats a create without an id as a bad answer", async () => {
  fetchMock.mockResolvedValueOnce(result(7)).mockResolvedValueOnce(result(true))
  const odoo = new OdooModuleService({}, options)
  await odoo.confirmSaleOrder(91)
  expect(sent(1)).toEqual(["sale.order", "action_confirm", [[91]], {}])

  fetchMock.mockResolvedValueOnce(result([])).mockResolvedValueOnce(result([])).mockResolvedValueOnce(result(false))
  expect(await category(odoo.upsertContact({ email: "a@b.c", name: "A" }))).toBe("invalid_response")
})

const address = { street: "12 Tahrir St", street2: "", city: "Cairo", zip: null, countryCode: "eg" }
const addressFields = { street: "12 Tahrir St", street2: false, city: "Cairo", zip: false, country_id: 65 }

it("creates a contact from an order with its delivery address", async () => {
  fetchMock.mockResolvedValueOnce(result(7)).mockResolvedValueOnce(result([])).mockResolvedValueOnce(result([4])).mockResolvedValueOnce(result([65])).mockResolvedValueOnce(result(12))
  await new OdooModuleService({}, options).upsertContact({ email: "sara@example.com", name: "Sara Ali", phone: "+20100", address })
  expect(sent(3)).toEqual(["res.country", "search", [[["code", "=", "EG"]]], { order: "id" }])
  expect(sent(4)).toEqual(["res.partner", "create", [{ name: "Sara Ali", email: "sara@example.com", phone: "+20100", category_id: [[4, 4]], ...addressFields }], {}])
})

it("reuses the contact's delivery address that matches exactly, or adds a new one", async () => {
  const delivery = { parent_id: 12, type: "delivery", name: "Sara Ali", phone: "+20100", ...addressFields }
  const domain = Object.entries(delivery).map(([field, value]) => [field, "=", value])
  fetchMock.mockResolvedValueOnce(result(7)).mockResolvedValueOnce(result([65])).mockResolvedValueOnce(result([13]))
  const odoo = new OdooModuleService({}, options)
  expect(await odoo.upsertDeliveryAddress(12, { name: "Sara Ali", phone: "+20100", address })).toBe(13)
  expect(sent(2)).toEqual(["res.partner", "search", [domain], { order: "id" }])

  fetchMock.mockResolvedValueOnce(result([65])).mockResolvedValueOnce(result([])).mockResolvedValueOnce(result(14))
  expect(await odoo.upsertDeliveryAddress(12, { name: "Sara Ali", phone: "+20100", address })).toBe(14)
  expect(sent(5)).toEqual(["res.partner", "create", [delivery], {}])
})
