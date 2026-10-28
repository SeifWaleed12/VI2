import OdooModuleService, { OdooError } from "../service"

const options = { url: "https://odoo.example.com", db: "vi2", login: "sync@example.com", apiKey: "key" }

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
