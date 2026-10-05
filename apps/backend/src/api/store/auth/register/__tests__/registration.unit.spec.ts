jest.mock("@medusajs/framework/utils", () => ({
  Modules: { CUSTOMER: "customer", AUTH: "auth" },
  ContainerRegistrationKeys: { CONFIG_MODULE: "config", LOGGER: "logger" },
  generateJwtToken: jest.fn(() => "test-token"),
}))
jest.mock("@medusajs/core-flows", () => ({ createCustomerAccountWorkflow: jest.fn() }))

import { generateJwtToken } from "@medusajs/framework/utils"
import { createCustomerAccountWorkflow } from "@medusajs/core-flows"
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { POST } from "../route"

const input = { email: " TEST@example.com ", password: " password ", first_name: " Test ", last_name: " User " }
const authService = { register: jest.fn(), deleteAuthIdentities: jest.fn() }
const customerService = { listCustomers: jest.fn() }
const logger = { error: jest.fn() }
const run = jest.fn()

function context(body: unknown = input) {
  const services = { customer: customerService, auth: authService, logger,
    config: { projectConfig: { http: { jwtSecret: "test-only-secret", jwtExpiresIn: "1d" } } } }
  const resolve = jest.fn((key: keyof typeof services) => services[key])
  const req = { body, scope: { resolve }, headers: {}, query: {}, url: "/store/auth/register", protocol: "https" } as unknown as MedusaRequest
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as unknown as MedusaResponse
  return { req, res, resolve }
}

beforeEach(() => {
  jest.clearAllMocks()
  customerService.listCustomers.mockResolvedValue([])
  authService.register.mockResolvedValue({ success: true, authIdentity: { id: "auth_test" } })
  authService.deleteAuthIdentities.mockResolvedValue(undefined)
  run.mockResolvedValue({ result: { id: "cus_test", email: "test@example.com" } })
  jest.mocked(createCustomerAccountWorkflow).mockReturnValue({ run } as unknown as ReturnType<typeof createCustomerAccountWorkflow>)
  jest.mocked(generateJwtToken).mockReturnValue("test-token")
})

test.each([null, [], { ...input, email: 42 }, { ...input, password: " " }, { ...input, phone: {} }, { ...input, first_name: " " }])("rejects invalid registration before service calls", async (body) => {
  const { req, res, resolve } = context(body)
  await POST(req, res)
  expect(res.status).toHaveBeenCalledWith(400)
  expect(resolve).not.toHaveBeenCalled()
})

test("normalizes email and names while preserving the actual password", async () => {
  const { req, res } = context()
  await POST(req, res)
  expect(customerService.listCustomers).toHaveBeenCalledWith({ email: "test@example.com", has_account: true })
  expect(authService.register).toHaveBeenCalledWith("emailpass", expect.objectContaining({ body: { email: "test@example.com", password: input.password } }))
  expect(run).toHaveBeenCalledWith({ input: { authIdentityId: "auth_test", customerData: { email: "test@example.com", first_name: "Test", last_name: "User", phone: undefined } } })
  expect(res.status).toHaveBeenCalledWith(201)
})

test("uses the same safe registration error for existing accounts and provider rejection", async () => {
  customerService.listCustomers.mockResolvedValue([{ id: "cus_existing" }])
  const duplicate = context()
  await POST(duplicate.req, duplicate.res)
  customerService.listCustomers.mockResolvedValue([])
  authService.register.mockResolvedValue({ success: false, error: "private authentication error" })
  const rejected = context()
  await POST(rejected.req, rejected.res)
  expect(duplicate.res.json).toHaveBeenCalledWith({ message: "Unable to register with these details. Try signing in or contact support." })
  expect(rejected.res.json).toHaveBeenCalledWith({ message: "Unable to register with these details. Try signing in or contact support." })
})

test("handles customer lookup outages without disclosing exception details", async () => {
  customerService.listCustomers.mockRejectedValueOnce(new Error("private connection credentials"))
  const { req, res } = context()
  await POST(req, res)
  expect(res.status).toHaveBeenCalledWith(500)
  expect(res.json).toHaveBeenCalledWith({ message: "Registration could not be completed." })
  expect(logger.error).toHaveBeenCalledWith("Customer registration failed")
})

test("compensates identity when customer creation fails", async () => {
  run.mockRejectedValueOnce(new Error("private workflow failure"))
  const { req, res } = context()
  await POST(req, res)
  expect(authService.deleteAuthIdentities).toHaveBeenCalledWith(["auth_test"])
  expect(res.status).toHaveBeenCalledWith(500)
  expect(res.json).toHaveBeenCalledWith({ message: "Registration could not be completed." })
})

test("does not delete a linked auth identity if token generation fails after account creation", async () => {
  jest.mocked(generateJwtToken).mockImplementationOnce(() => { throw new Error("private signing failure") })
  const { req, res } = context()
  await POST(req, res)
  expect(authService.deleteAuthIdentities).not.toHaveBeenCalled()
  expect(res.status).toHaveBeenCalledWith(500)
})

test("failed compensation logs an identity reference without raw secrets", async () => {
  run.mockRejectedValueOnce(new Error("private workflow failure"))
  authService.deleteAuthIdentities.mockRejectedValueOnce(new Error("private provider secret"))
  const { req, res } = context()
  await POST(req, res)
  expect(logger.error).toHaveBeenCalledWith("Failed to compensate auth identity auth_test after customer creation failure")
  expect(res.status).toHaveBeenCalledWith(500)
})

test("a previous guest checkout with the same email does not block registration", async () => {
  // Only registered accounts are looked up; a guest record is not returned.
  customerService.listCustomers.mockImplementation(async (filters: { has_account?: boolean }) =>
    filters.has_account === true ? [] : [{ id: "cus_guest", has_account: false }])
  const { req, res } = context()
  await POST(req, res)
  expect(res.status).toHaveBeenCalledWith(201)
})
