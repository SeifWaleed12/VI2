import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { cartOwnerOnly } from "../cart-access"
import { POST as confirmEmail } from "../store/email-change/confirm/route"
import { signEmailChange } from "../../lib/email-change"
jest.mock("../../workflows/change-customer-email", () => ({ changeCustomerEmailWorkflow: jest.fn() }))

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
  const token = signEmailChange({ customer_id: "cus_1", from: "old@example.invalid", to: "new@example.invalid" }, "audit-test-secret")
  await expect(confirmEmail({ body: { token }, scope } as never, {} as never)).rejects.toThrow("lease lost")
  expect(graph).not.toHaveBeenCalled()
})
