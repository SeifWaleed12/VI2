import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { cartOwnerOnly } from "../cart-access"
import { POST as confirmEmail } from "../store/email-change/confirm/route"
import { signEmailChange } from "../../lib/email-change"
import { credentialStamp } from "../../lib/security-session"
import { changeCustomerEmailWorkflow } from "../../workflows/change-customer-email"
jest.mock("../../workflows/change-customer-email", () => ({ changeCustomerEmailWorkflow: jest.fn() }))

it("rejects a previously signed email link after password recovery", async () => {
  const secret = "test-email-credential-secret"
  const token = signEmailChange({ customer_id: "cus_1", from: "old@example.invalid", to: "new@example.invalid", credential_stamp: credentialStamp("before-recovery", secret) }, secret)
  const login = { id: "provider_1", auth_identity_id: "auth_1", provider_metadata: { password: "after-recovery" }, auth_identity: { app_metadata: { customer_id: "cus_1" } } }
  const auth = { listProviderIdentities: jest.fn(async filters => filters.entity_id === "new@example.invalid" ? [] : [login]) }
  const scope = { resolve: key => key === ContainerRegistrationKeys.CONFIG_MODULE ? { projectConfig: { http: { jwtSecret: secret } } }
    : key === Modules.AUTH ? auth : key === Modules.LOCKING ? { execute: (_key, work) => work() }
    : { graph: async () => ({ data: [{ id: "cus_1", email: "old@example.invalid", has_account: true }] }) } }
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
  await confirmEmail({ body: { token }, scope } as never, res as never)
  expect(res.status).toHaveBeenCalledWith(400)
  expect(changeCustomerEmailWorkflow).not.toHaveBeenCalled()
})

it("does not create a guest or change cart ownership after cancellation", async () => {
  const query = { graph: jest.fn(async () => ({ data: [{ id: "cart_1", customer: { has_account: false } }] })) }
  const customers = { listCustomers: jest.fn(), createCustomers: jest.fn() }, carts = { updateCarts: jest.fn() }
  const scope = { resolve: (key: string) => key === ContainerRegistrationKeys.QUERY ? query : key === Modules.CUSTOMER ? customers : key === Modules.CART ? carts : { execute: async (_key: string, work: (signal: AbortSignal) => unknown) => work(AbortSignal.abort(new Error("lease lost"))) } }
  const req = { method: "POST", originalUrl: "/store/carts/cart_1", params: { id: "cart_1" }, body: { email: "guest@example.invalid" }, scope }
  await expect(cartOwnerOnly(req as never, {} as never, jest.fn())).rejects.toThrow("lease lost")
  expect(customers.createCustomers).not.toHaveBeenCalled()
  expect(carts.updateCarts).not.toHaveBeenCalled()
})

it("rechecks ownership after acquiring the cart lock", async () => {
  const query = { graph: jest.fn().mockResolvedValueOnce({ data: [{ id: "cart_1", customer: { has_account: false } }] })
    .mockResolvedValueOnce({ data: [{ id: "cart_1", customer: { id: "someone_else", has_account: true } }] }) }
  const carts = { updateCarts: jest.fn() }
  const scope = { resolve: (key: string) => key === ContainerRegistrationKeys.QUERY ? query : key === Modules.CART ? carts : { execute: async (_key: string, work: (signal: AbortSignal) => unknown) => work(new AbortController().signal) } }
  const req = { method: "POST", originalUrl: "/store/carts/cart_1", params: { id: "cart_1" }, body: { email: "guest@example.invalid" }, scope }
  await expect(cartOwnerOnly(req as never, {} as never, jest.fn())).rejects.toThrow("belongs to a customer account")
  expect(carts.updateCarts).not.toHaveBeenCalled()
})

it("does not begin an email-change workflow after losing its lock", async () => {
  const graph = jest.fn()
  const scope = { resolve: (key: string) => key === ContainerRegistrationKeys.CONFIG_MODULE ? { projectConfig: { http: { jwtSecret: "audit-test-secret" } } }
    : key === Modules.LOCKING ? { execute: async (_key: string, work: (signal: AbortSignal) => unknown) => work(AbortSignal.abort(new Error("lease lost"))) } : { graph } }
  const token = signEmailChange({ customer_id: "cus_1", from: "old@example.invalid", to: "new@example.invalid", credential_stamp: "dummy-stamp" }, "audit-test-secret")
  await expect(confirmEmail({ body: { token }, scope } as never, {} as never)).rejects.toThrow("lease lost")
  expect(graph).not.toHaveBeenCalled()
})


it.each(["/store/CARTS/cart_1", "/STORE/carts/cart_1"])("enforces cart ownership regardless of route case: %s", async originalUrl => {
  const graph = jest.fn(async () => ({ data: [{ id: "cart_1", customer: { id: "cus_owner", has_account: true } }] }))
  const next = jest.fn()
  await expect(cartOwnerOnly({ originalUrl, method: "GET", params: { id: "cart_1" }, scope: { resolve: () => ({ graph }) } } as never, {} as never, next)).rejects.toThrow("belongs to a customer account")
  expect(graph).toHaveBeenCalledWith(expect.objectContaining({ entity: "cart", filters: { id: "cart_1" } }))
  expect(next).not.toHaveBeenCalled()
})
