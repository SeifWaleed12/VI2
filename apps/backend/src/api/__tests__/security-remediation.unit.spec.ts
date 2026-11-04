import { secureEmailpass } from "../emailpass-security"
import { protectAdminCookieWrites, rotateLoginSession } from "../session-security"
import { customerReturnOnly } from "../return-access"
import { POST as upload } from "../admin/uploads/route"
import { POST as presigned } from "../admin/uploads/presigned-urls/route"
import { MAX_CSV_UPLOAD_BYTES } from "../../lib/csv-upload"
import sharp from "sharp"
import { randomBytes } from "node:crypto"
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
it("accepts real raster images above the logo cap, re-encodes them as WebP in products/ and tracks them for cleanup", async () => {
  const run = jest.fn(async () => ({ result: [{ id: "products/file_1.webp", url: "http://media.test/products/file_1.webp" }] }))
  jest.mocked(uploadFilesWorkflow).mockReturnValue({ run } as never)
  // Random pixels do not compress, so this real PNG is over the 1 MB logo cap.
  const buffer = await sharp(randomBytes(1000 * 1000 * 3), { raw: { width: 1000, height: 1000, channels: 3 } }).png({ compressionLevel: 0 }).toBuffer()
  expect(buffer.length).toBeGreaterThan(1024 * 1024)
  expect(buffer.length).toBeLessThan(10 * 1024 * 1024)
  const createUploadedMedias = jest.fn(async () => [])
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
  await upload({ files: [{ buffer }], scope: { resolve: () => ({ createUploadedMedias }) } } as never, res as never)
  expect(run).toHaveBeenCalledWith({ input: { files: [expect.objectContaining({ mimeType: "image/webp", filename: expect.stringMatching(/^products\/[0-9a-f-]{36}\.webp$/) })] } })
  expect(createUploadedMedias).toHaveBeenCalledWith([{ id: "products/file_1.webp", url: "http://media.test/products/file_1.webp" }])
}, 30_000)
it("deletes the stored images and fails when they cannot be tracked, so no file escapes cleanup", async () => {
  const run = jest.fn(async () => ({ result: [{ id: "products/file_1.webp", url: "http://media.test/products/file_1.webp" }] }))
  jest.mocked(uploadFilesWorkflow).mockReturnValue({ run } as never)
  const buffer = await sharp({ create: { width: 800, height: 800, channels: 3, background: "#ffffff" } }).png().toBuffer()
  const deleteFiles = jest.fn(async () => undefined)
  const createUploadedMedias = jest.fn(async () => { throw new Error("database unavailable") })
  const resolve = (key: string) => (key === "file" ? { deleteFiles } : key === "logger" ? { warn: jest.fn(), error: jest.fn() } : { createUploadedMedias })
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
  await expect(upload({ files: [{ buffer }], scope: { resolve } } as never, res as never)).rejects.toThrow("could not be saved")
  expect(deleteFiles).toHaveBeenCalledWith(["products/file_1.webp"])
  expect(res.json).not.toHaveBeenCalled()
})
it("rejects generic images above 10 MiB before any upload", async () => {
  jest.mocked(uploadFilesWorkflow).mockClear()
  const buffer = Buffer.alloc(10 * 1024 * 1024 + 1)
  Buffer.from([0xff, 0xd8, 0xff]).copy(buffer)
  await expect(upload({ files: [{ buffer }] } as never, {} as never)).rejects.toThrow("10 MB")
  expect(uploadFilesWorkflow).not.toHaveBeenCalled()
})
it.each(["text/csv", "application/vnd.ms-excel"])("uploads CSV with a generated private name and canonical MIME: %s", async mimetype => {
  const run = jest.fn(async () => ({ result: [{ id: "csv_1" }] }))
  jest.mocked(uploadFilesWorkflow).mockReturnValue({ run } as never)
  const buffer = Buffer.from("Product Handle,Product Title\ndummy,Dummy\n")
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
  await upload({ files: [{ buffer, originalname: "../client-name.csv", mimetype }] } as never, res as never)
  expect(run).toHaveBeenCalledWith({ input: { files: [{ filename: expect.stringMatching(/^imports\/[0-9a-f-]{36}\.csv$/), mimeType: "text/csv", access: "private", content: buffer.toString("base64") }] } })
})
it.each([
  ["text/html", Buffer.from("<html>active</html>")],
  ["image/svg+xml", Buffer.from("<svg/>")],
  ["text/csv", Buffer.from("dummy\0csv")],
  ["text/csv", Buffer.alloc(MAX_CSV_UPLOAD_BYTES + 1, "x")],
])("rejects unsafe CSV before uploading: %s", async (mimetype, buffer) => {
  jest.mocked(uploadFilesWorkflow).mockClear()
  await expect(upload({ files: [{ buffer, originalname: "dummy.csv", mimetype }] } as never, {} as never)).rejects.toThrow("CSV")
  expect(uploadFilesWorkflow).not.toHaveBeenCalled()
})
it.each(["text/csv", "application/vnd.ms-excel"])("presigns CSV in the imports folder with private access: %s", async mime_type => {
  const getUploadFileUrls = jest.fn(async () => ({ url: "/admin/uploads", key: "generated.csv" }))
  const req = { validatedBody: { originalname: "client.csv", mime_type, size: 32, access: "public" }, scope: { resolve: () => ({ getUploadFileUrls }) } }
  const res = { json: jest.fn() }
  await presigned(req as never, res as never)
  expect(getUploadFileUrls).toHaveBeenCalledWith({ filename: expect.stringMatching(/^imports\/[0-9a-f-]{36}\.csv$/), mimeType: "text/csv", access: "private" })
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ filename: "generated.csv", mime_type: "text/csv", extension: "csv" }))
})
it.each([
  ["dummy.csv", "text/html", 32], ["dummy.html", "text/html", 32], ["dummy.svg", "image/svg+xml", 32],
  ["dummy.png", "image/png", 32], ["dummy.csv", "text/csv", MAX_CSV_UPLOAD_BYTES + 1],
])("refuses non-CSV or oversized presigning: %s %s", async (originalname, mime_type, size) => {
  await expect(presigned({ validatedBody: { originalname, mime_type, size } } as never, {} as never)).rejects.toThrow("CSV")
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
