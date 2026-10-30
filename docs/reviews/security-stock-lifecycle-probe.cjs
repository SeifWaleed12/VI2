// Dummy-data unit probe of native order arithmetic; no server or database.
const assert = require("node:assert/strict")
const { calculateOrderChange } = require("@medusajs/order/dist/utils/calculate-order-change")
const { ChangeActionType, MathBN } = require("@medusajs/framework/utils")
require("@medusajs/order/dist/utils/actions/return-item")
require("@medusajs/order/dist/utils/actions/receive-return-item")
require("@medusajs/order/dist/utils/actions/cancel-item-fulfillment")

const order = {
  id: "order_dummy", metadata: {}, total: 100, credit_lines: [],
  items: [{ id: "item_dummy", unit_price: 100, quantity: 1, detail: {
    quantity: 1, fulfilled_quantity: 1, shipped_quantity: 0,
    return_requested_quantity: 0, return_received_quantity: 0,
  } }],
}
const action = type => ({ action: type, details: { reference_id: "item_dummy", quantity: 1 } })
const result = calculateOrderChange({ order, actions: [
  action(ChangeActionType.RETURN_ITEM),
  action(ChangeActionType.RECEIVE_RETURN_ITEM),
  action(ChangeActionType.CANCEL_ITEM_FULFILLMENT),
] })
const detail = result.order.items[0].detail
const numeric = key => MathBN.convert(detail[key]).toNumber()
assert.equal(numeric("fulfilled_quantity"), 0)
assert.equal(numeric("return_received_quantity"), 1)
console.log(JSON.stringify({
  result: "native order arithmetic accepts receipt then cancellation of an unshipped item",
  fulfilled_quantity: numeric("fulfilled_quantity"),
  shipped_quantity: numeric("shipped_quantity"),
  return_received_quantity: numeric("return_received_quantity"),
  limitation: "No API authorization, native inventory adjustment, transaction, reservation or concurrent workflow was executed. The stock-inflation candidate remains unresolved.",
}, null, 2))
