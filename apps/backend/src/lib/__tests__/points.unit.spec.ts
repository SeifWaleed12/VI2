import { cappedRemoval, earnsPoints, expiresAt, isFullyDelivered, pointsFor } from "../points"

it("gives one point per EGP, rounded down, never negative (P-1, P-3)", () => {
  expect(pointsFor(100)).toBe(100)
  expect(pointsFor(149.9)).toBe(149)
  expect(pointsFor("1500")).toBe(1500)
  expect(pointsFor(undefined)).toBe(0)
  expect(pointsFor(-20)).toBe(0)
})

const delivered = { status: "pending", customer: { has_account: true }, items: [{ quantity: 2, detail: { delivered_quantity: 2 } }] }

it("earns only for a registered customer's fully delivered, not canceled order (P-4, P-5)", () => {
  expect(earnsPoints(delivered)).toBe(true)
  expect(earnsPoints({ ...delivered, customer: { has_account: false } })).toBe(false)
  expect(earnsPoints({ ...delivered, status: "canceled" })).toBe(false)
  expect(earnsPoints({ ...delivered, items: [{ quantity: 2, detail: { delivered_quantity: 1 } }] })).toBe(false)
  expect(isFullyDelivered({ items: [] })).toBe(false)
  expect(earnsPoints(undefined)).toBe(false)
})

it("expires 12 months after the last activity (P-7)", () => {
  expect(expiresAt("2026-10-20T10:00:00.000Z").toISOString()).toBe("2027-10-20T10:00:00.000Z")
})

it("never removes more than the balance or the limit (P-8, P-9)", () => {
  expect(cappedRemoval(500, 300)).toBe(300)
  expect(cappedRemoval(500, 300, 100)).toBe(100)
  expect(cappedRemoval(50, 300)).toBe(50)
  expect(cappedRemoval(50, 0)).toBe(0)
  expect(cappedRemoval(50, -10)).toBe(0)
})
