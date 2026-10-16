import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { CartProvider, useCart, type CartContextValue } from "../cart-provider"
import { addCartItem, createCart, getCart } from "@/lib/medusa/services/cart"
import type { Product } from "@/types/product"

jest.mock("../region-provider", () => ({ useRegion: () => ({ regionId: "reg_eg" }) }))
jest.mock("@/lib/medusa/services/cart", () => ({ createCart: jest.fn(), addCartItem: jest.fn(), getCart: jest.fn() }))
const capture = jest.fn<void, [CartContextValue]>()
function Capture() { capture(useCart()); return null }
const product = { id: "prod_1", variantId: "variant_1" } as Product
const storage = new Map<string, string>()

beforeAll(() => {
  Object.assign(globalThis, { window: { localStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) } } })
})
afterAll(() => { delete (globalThis as { window?: unknown }).window })
beforeEach(() => {
  jest.clearAllMocks()
  storage.clear()
  jest.mocked(addCartItem).mockImplementation(async (id) => ({ id, items: [] }) as never)
  renderToStaticMarkup(createElement(CartProvider, null, createElement(Capture)))
})

it("creates one cart when two adds start before any cart exists", async () => {
  jest.mocked(createCart).mockResolvedValue({ id: "cart_new", items: [] } as never)
  const { addItem } = capture.mock.calls[0][0]
  await expect(Promise.all([addItem(product), addItem(product)])).resolves.toEqual([true, true])
  expect(createCart).toHaveBeenCalledTimes(1)
  expect(addCartItem).toHaveBeenNthCalledWith(1, "cart_new", "variant_1", 1)
  expect(addCartItem).toHaveBeenNthCalledWith(2, "cart_new", "variant_1", 1)
})

it("keeps the saved cart when Medusa cannot be reached", async () => {
  const log = jest.spyOn(console, "error").mockImplementation(() => {})
  storage.set("vi2-medusa-cart-id", "cart_saved")
  jest.mocked(getCart).mockRejectedValue(new Error("offline"))
  await expect(capture.mock.calls[0][0].addItem(product)).resolves.toBe(false)
  expect(createCart).not.toHaveBeenCalled()
  expect(storage.get("vi2-medusa-cart-id")).toBe("cart_saved")
  log.mockRestore()
})

it("starts a new cart only when the saved one is gone", async () => {
  storage.set("vi2-medusa-cart-id", "cart_gone")
  jest.mocked(getCart).mockResolvedValue(null)
  jest.mocked(createCart).mockResolvedValue({ id: "cart_new", items: [] } as never)
  await expect(capture.mock.calls[0][0].addItem(product)).resolves.toBe(true)
  expect(createCart).toHaveBeenCalledTimes(1)
  expect(addCartItem).toHaveBeenCalledWith("cart_new", "variant_1", 1)
})
