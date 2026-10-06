import { allocationProblem } from "../order-allocation"

const line = { orderStatus: "pending", unfulfilledQuantity: 3, unitsPerItem: 1, alreadyReserved: 0 }

it("allows allocating up to what the order line needs", () => {
  expect(allocationProblem(line, 3)).toBeNull()
  expect(allocationProblem({ ...line, alreadyReserved: 2 }, 1)).toBeNull()
})

it("counts bundles by the stock units each item uses", () => {
  expect(allocationProblem({ ...line, unitsPerItem: 2 }, 6)).toBeNull()
  expect(allocationProblem({ ...line, unitsPerItem: 2 }, 7)).toContain("At most 6")
})

it.each([
  [{ ...line, alreadyReserved: 2 }, 2, "At most 1 more"],
  [{ ...line, alreadyReserved: 5 }, 1, "At most 0 more"],
  [{ ...line, unitsPerItem: null }, 1, "not part of the ordered product"],
  [{ ...line, orderStatus: "canceled" }, 1, "canceled"],
  [null, 1, "existing order"],
  [{ ...line, alreadyReserved: Number.NaN }, 1, "could not be checked"],
  [{ ...line, unfulfilledQuantity: Number.NaN }, 1, "could not be checked"],
  [line, 0, "positive quantity"],
  [line, -1, "positive quantity"],
  [line, "2", "positive quantity"],
  [line, Number.NaN, "positive quantity"],
])("refuses %j with quantity %p", (orderLine, quantity, reason) => {
  expect(allocationProblem(orderLine, quantity)).toContain(reason)
})
