import { medusa } from "../../client"
import { getCart } from "../cart"
import { getShippingOptions } from "../shipping"

jest.mock("../../client", () => ({ medusa: { store: { cart: { retrieve: jest.fn() }, fulfillment: { listCartOptions: jest.fn() } } } }))
const retrieve = jest.mocked(medusa.store.cart.retrieve)
const listOptions = jest.mocked(medusa.store.fulfillment.listCartOptions)
const httpError = (status: number) => Object.assign(new Error(`HTTP ${status}`), { status })

beforeEach(() => jest.resetAllMocks())

it.each([404, 403])("treats a %s cart as no cart, so a new one can start", async (status) => {
  retrieve.mockRejectedValue(httpError(status))
  await expect(getCart("cart_1")).resolves.toBeNull()
})

it.each([["a server error", httpError(500)], ["a network failure", new TypeError("fetch failed")]])("throws on %s instead of reporting the cart as gone", async (_label, error) => {
  retrieve.mockRejectedValue(error)
  await expect(getCart("cart_1")).rejects.toBe(error)
})

it("returns no delivery options when Medusa has none, never invented ones", async () => {
  listOptions.mockResolvedValue({ shipping_options: [] } as never)
  await expect(getShippingOptions("cart_1")).resolves.toEqual([])
})

it("maps Medusa's options and lets a failure reach the caller", async () => {
  listOptions.mockResolvedValueOnce({ shipping_options: [{ id: "so_1", name: "Standard", amount: 50 }] } as never)
  await expect(getShippingOptions("cart_1")).resolves.toEqual([{ id: "so_1", name: "Standard", amount: 50, isCalculatedPrice: undefined, data: undefined }])
  listOptions.mockRejectedValueOnce(new Error("offline"))
  await expect(getShippingOptions("cart_1")).rejects.toThrow("offline")
})
