import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { CartProvider, useCart, type CartContextValue } from "../cart-provider"
import { addCartItem, createCart } from "@/lib/medusa/services/cart"
import type { Product } from "@/types/product"
import { forgetPendingCart } from "@/lib/pending-checkout"

jest.mock("../region-provider", () => ({ useRegion: () => ({ regionId: "reg_eg" }) }))
jest.mock("@/lib/medusa/services/cart", () => ({ createCart: jest.fn(), addCartItem: jest.fn() }))
jest.mock("@/lib/pending-checkout", () => ({ forgetPendingCart: jest.fn() }))
const capture = jest.fn<void, [CartContextValue]>()
function Capture() { capture(useCart()); return null }
beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(createCart).mockResolvedValue({ id: "cart_1", items: [] } as never)
  renderToStaticMarkup(createElement(CartProvider, null, createElement(Capture)))
})

it("returns true only after Medusa accepts the variant", async () => {
  jest.mocked(addCartItem).mockResolvedValue({ id: "cart_1", items: [] } as never)
  await expect(capture.mock.calls[0][0].addItem({ id: "prod_1", variantId: "variant_1" } as Product)).resolves.toBe(true)
  expect(addCartItem).toHaveBeenCalledWith("cart_1", "variant_1", 1)
  // A confirmed change starts a new checkout, so an unconfirmed old one is not retried.
  expect(forgetPendingCart).toHaveBeenCalledTimes(1)
})

it("returns false on provider failure instead of resolving as success", async () => {
  const log = jest.spyOn(console, "error").mockImplementation(() => {})
  jest.mocked(addCartItem).mockRejectedValue(new Error("unavailable"))
  await expect(capture.mock.calls[0][0].addItem({ id: "prod_1", variantId: "variant_1" } as Product)).resolves.toBe(false)
  // The cart did not change, so an unconfirmed order can still be retried.
  expect(forgetPendingCart).not.toHaveBeenCalled()
  log.mockRestore()
})

it("treats Medusa's stock refusal as expected: false, with no error logged", async () => {
  const log = jest.spyOn(console, "error").mockImplementation(() => {})
  jest.mocked(addCartItem).mockRejectedValue(new Error("Some variant does not have the required inventory"))
  await expect(capture.mock.calls[0][0].addItem({ id: "prod_1", variantId: "variant_1" } as Product)).resolves.toBe(false)
  expect(log).not.toHaveBeenCalled()
  log.mockRestore()
})
