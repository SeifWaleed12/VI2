import { secureEmailpass } from "../emailpass-security"
import { protectAdminCookieWrites, rotateLoginSession } from "../session-security"
import { customerReturnOnly } from "../return-access"
import { POST as upload } from "../admin/uploads/route"
import { GET as receipt } from "../store/orders/[id]/route"
import { POST as nativeCustomer } from "../store/customers/route"
import { getOrderDetailWorkflow, uploadFilesWorkflow } from "@medusajs/medusa/core-flows"

jest.mock("@medusajs/medusa/core-flows", () => ({ getOrderDetailWorkflow: jest.fn(), uploadFilesWorkflow: jest.fn() }))

it.each(["probe", "CUSTOMER"])("rejects unsupported emailpass actors: %s", actor_type => {
  const next = jest.fn()
  expect(() => secureEmailpass({ params: { actor_type } } as never, {} as never, next)).toThrow("Unsupported account type")
  expect(next).not.toHaveBeenCalled()
})
it.each(["/auth/customer/emailpass/register", "/auth/customer/EMAILPASS/REGISTER"])("closes native customer registration: %s", originalUrl => {
  expect(() => secureEmailpass({ params: { actor_type: "customer" }, method: "POST", originalUrl } as never, {} as never, jest.fn())).toThrow("/store/auth/register")
})
it("closes the native customer creation door", async () => {
  await expect(nativeCustomer({} as never, {} as never)).rejects.toThrow("/store/auth/register")
})
it("does not continue a login until session regeneration succeeds", () => {
  let done!: (error?: unknown) => void
  const next = jest.fn()
  rotateLoginSession({ session: { regenerate: (callback: typeof done) => { done = callback } } } as never, {} as never, next)
  expect(next).not.toHaveBeenCalled()
  const error = new Error("session store unavailable")
  done(error)
  expect(next).toHaveBeenCalledWith(error)
})
it.each([{ receive_now: true }, { return_shipping: { price: 0 } }])("rejects customer-controlled receipt/price: %j", async body => {
  await expect(customerReturnOnly({ body } as never, {} as never, jest.fn())).rejects.toThrow("Only staff")
})
it("rejects returns on another customer's order", async () => {
  const next = jest.fn()
  const graph = jest.fn(async () => ({ data: [{ customer_id: "cus_owner" }] }))
  await expect(customerReturnOnly({ body: { order_id: "order_1" }, auth_context: { actor_id: "cus_other" }, scope: { resolve: () => ({ graph }) } } as never, {} as never, next)).rejects.toThrow("order owner's login")
  expect(next).not.toHaveBeenCalled()
})
it("rejects active content without uploading any files", async () => {
  await expect(upload({ files: [{ buffer: Buffer.from("<html>script</html>") }] } as never, {} as never)).rejects.toThrow("PNG, JPEG or WebP")
  expect(uploadFilesWorkflow).not.toHaveBeenCalled()
})
it("accepts generic raster images above the logo cap, through 10 MiB", async () => {
  const run = jest.fn(async () => ({ result: [{ id: "file_1" }] }))
  jest.mocked(uploadFilesWorkflow).mockReturnValue({ run } as never)
  const buffer = Buffer.alloc(10 * 1024 * 1024)
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer)
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
  await upload({ files: [{ buffer }] } as never, res as never)
  expect(run).toHaveBeenCalledWith({ input: { files: [expect.objectContaining({ mimeType: "image/png", filename: expect.stringMatching(/\.png$/) })] } })
  expect(res.json).toHaveBeenCalledWith({ files: [{ id: "file_1" }] })
})
it("rejects generic images above 10 MiB before any upload", async () => {
  jest.mocked(uploadFilesWorkflow).mockClear()
  const buffer = Buffer.alloc(10 * 1024 * 1024 + 1)
  Buffer.from([0xff, 0xd8, 0xff]).copy(buffer)
  await expect(upload({ files: [{ buffer }] } as never, {} as never)).rejects.toThrow("10 MB")
  expect(uploadFilesWorkflow).not.toHaveBeenCalled()
})
it("ignores public field expansion and requests only receipt data", async () => {
  const run = jest.fn(async (_input: unknown) => ({ result: { id: "order_1", email: "private@example.test", shipping_address: { phone: "private" }, items: [{ id: "item_1", title: "Whey", metadata: { private: "secret" } }] } }))
  jest.mocked(getOrderDetailWorkflow).mockReturnValue({ run } as never)
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
  await receipt({ params: { id: "order_1" }, queryConfig: { fields: ["email", "*shipping_address"] } } as never, res as never)
  const input = run.mock.calls[0][0] as unknown as { input: { fields: string[] } }
  expect(input.input.fields).toContain("total")
  expect(input.input.fields).not.toContain("email")
  expect(input.input.fields).not.toContain("*shipping_address")
  const body = res.json.mock.calls[0][0]
  expect(body.order.email).toBeUndefined()
  expect(body.order.shipping_address).toBeUndefined()
  expect(body.order.items[0].title).toBe("Whey")
  expect(body.order.items[0].metadata).toBeUndefined()
})


it.each([undefined, "https://files.example.com", "null"])("rejects untrusted cookie mutation origins: %s", origin => {
  const req = { method: "POST", protocol: "https", headers: { host: "admin.example.com", origin }, session: { auth_context: {} }, scope: { resolve: () => ({ projectConfig: { http: { adminCors: "https://admin.example.com" } } }) } }
  expect(() => protectAdminCookieWrites(req as never, {} as never, jest.fn())).toThrow("trusted origin")
})
it("keeps token-only integrations independent of cookie origins", () => {
  const next = jest.fn()
  protectAdminCookieWrites({ method: "POST", session: {} } as never, {} as never, next)
  expect(next).toHaveBeenCalled()
})
