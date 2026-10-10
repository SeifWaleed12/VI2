import { useCartAdd } from "../use-cart-add"
import type { Product } from "@/types/product"
import { useCart } from "@/context/CartContext"
import { useEffect, useRef, useState } from "react"

jest.mock("react", () => ({ useState: jest.fn(), useRef: jest.fn(), useEffect: jest.fn() }))
jest.mock("@/context/CartContext", () => ({ useCart: jest.fn() }))
const addItem = jest.fn()
const pending = jest.fn(), added = jest.fn(), failed = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  jest.useFakeTimers()
  jest.mocked(useCart).mockReturnValue({ addItem } as never)
  jest.mocked(useState).mockReturnValueOnce([false, pending]).mockReturnValueOnce([false, added]).mockReturnValueOnce([false, failed])
  jest.mocked(useRef).mockReturnValueOnce({ current: false }).mockReturnValueOnce({ current: null })
})
afterEach(() => { jest.useRealTimers() })

it("waits for confirmed success and rejects repeated submission while pending", async () => {
  let resolve!: (success: boolean) => void
  addItem.mockReturnValue(new Promise<boolean>(done => { resolve = done }))
  const action = useCartAdd({ id: "prod_1" } as Product)
  const request = action.handleAdd()
  await action.handleAdd()
  expect(addItem).toHaveBeenCalledTimes(1)
  expect(pending).toHaveBeenLastCalledWith(true)
  expect(added).toHaveBeenLastCalledWith(false)
  resolve(true)
  await request
  expect(added).toHaveBeenLastCalledWith(true)
  expect(pending).toHaveBeenLastCalledWith(false)
  jest.advanceTimersByTime(1100)
  expect(added).toHaveBeenLastCalledWith(false)
})

it.each(["false", "reject"])("never reports success on %s and permits a retry", async outcome => {
  if (outcome === "false") addItem.mockResolvedValueOnce(false)
  else addItem.mockRejectedValueOnce(new Error("offline"))
  addItem.mockResolvedValueOnce(true)
  const action = useCartAdd({ id: "prod_1" } as Product)
  await action.handleAdd()
  expect(added).not.toHaveBeenCalledWith(true)
  expect(failed).toHaveBeenLastCalledWith(true)
  expect(pending).toHaveBeenLastCalledWith(false)
  await action.handleAdd()
  expect(addItem).toHaveBeenCalledTimes(2)
  expect(added).toHaveBeenLastCalledWith(true)
})

it("clears the confirmation timer on unmount", async () => {
  addItem.mockResolvedValue(true)
  const action = useCartAdd({ id: "prod_1" } as Product)
  const cleanup = jest.mocked(useEffect).mock.calls[0][0]()
  await action.handleAdd()
  expect(jest.getTimerCount()).toBe(1)
  if (typeof cleanup === "function") cleanup()
  expect(jest.getTimerCount()).toBe(0)
})
