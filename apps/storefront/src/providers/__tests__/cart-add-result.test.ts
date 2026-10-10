import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { CartProvider, useCart, type CartContextValue } from "../cart-provider"
import { addCartItem, createCart } from "@/lib/medusa/services/cart"
import type { Product } from "@/types/product"

jest.mock("../region-provider", () => ({ useRegion: () => ({ regionId: "reg_eg" }) }))
jest.mock("@/lib/medusa/services/cart", () => ({ createCart: jest.fn(), addCartItem: jest.fn() }))
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
})

it("returns false on provider failure instead of resolving as success", async () => {
  const log = jest.spyOn(console, "error").mockImplementation(() => {})
  jest.mocked(addCartItem).mockRejectedValue(new Error("unavailable"))
  await expect(capture.mock.calls[0][0].addItem({ id: "prod_1", variantId: "variant_1" } as Product)).resolves.toBe(false)
  log.mockRestore()
})
