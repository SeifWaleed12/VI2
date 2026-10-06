import { existingVariantStockSettings, managerAction } from "../manager-access"

it.each([
  ["GET", "/admin/orders", "order", "read"],
  ["POST", "/admin/orders/order_1/fulfillments", "order", "update"],
  ["POST", "/admin/orders/order_1/cancel", "order", "update"],
  ["POST", "/admin/payments/pay_1/refund", "payment", "update"],
  ["POST", "/admin/returns", "return", "create"],
  ["DELETE", "/admin/products/prod_1", "product", "delete"],
  ["POST", "/admin/products", "product", "create"],
  ["POST", "/admin/collections/col_1", "product_collection", "update"],
  ["POST", "/admin/product-types", "product_type", "create"],
  ["DELETE", "/admin/brands/brand_1", "brand", "delete"],
  ["POST", "/admin/customers/cus_1", "customer", "update"],
  ["POST", "/admin/promotions", "promotion", "create"],
  ["POST", "/admin/price-lists/pl_1/prices/batch", "price_list", "update"],
  ["POST", "/admin/uploads", "file", "create"],
  ["GET", "/admin/inventory-items/inv_1", "inventory_item", "read"],
  ["GET", "/admin/stores", "store", "read"],
  ["GET", "/admin/regions/reg_1", "region", "read"],
])("gives a manager %s %s as %s:%s", (method, path, resource, operation) => {
  expect(managerAction(method, path)).toEqual({ resource, operation })
})

it("allows prices, publishing and deletion in product payloads", () => {
  expect(managerAction("POST", "/admin/products/prod_1", { status: "published", variants: [{ id: "v1", prices: [{ amount: 100, currency_code: "egp" }] }] })?.operation).toBe("update")
  expect(managerAction("POST", "/admin/products/batch", { delete: ["prod_2"] })?.operation).toBe("update")
})

it.each([
  ["GET", "/admin/api-keys"],
  ["GET", "/admin/api-keys/apk_1"],
  ["GET", "/admin/users"],
  ["GET", "/admin/users/user_2"],
  ["POST", "/admin/users/me"],
  ["POST", "/admin/users/user_1/reset-password"],
  ["GET", "/admin/invites"],
  ["GET", "/admin/rbac/roles"],
  ["POST", "/admin/rbac/roles"],
  ["GET", "/admin/workflows-executions"],
  ["POST", "/admin/workflows-executions/wf/run"],
  ["POST", "/admin/stores/store_1"],
  ["POST", "/admin/regions"],
  ["POST", "/admin/sales-channels"],
  ["POST", "/admin/stock-locations/sloc_1/fulfillment-sets"],
  ["POST", "/admin/tax-regions"],
  ["POST", "/admin/inventory-items/inv_1/location-levels/sloc_1"],
  ["DELETE", "/admin/inventory-items/inv_1"],
  ["GET", "/admin/search"],
  ["GET", "/admin/index/details"],
  ["POST", "/admin/products/import"],
  ["POST", "/admin/products/prod_1/variants/v1/inventory-items"],
  ["GET", "/admin/custom"],
  ["GET", "/admin/reports/revenue"],
  ["PATCH", "/admin/products/prod_1"],
])("keeps %s %s admin only", (method, path) => {
  expect(managerAction(method, path)).toBeNull()
})

it("treats exports as reading", () => {
  expect(managerAction("POST", "/admin/orders/export")).toEqual({ resource: "order", operation: "read" })
  expect(managerAction("POST", "/admin/products/export")).toEqual({ resource: "product", operation: "read" })
})

it("refuses inventory links in any product payload", () => {
  expect(managerAction("POST", "/admin/products/prod_1/variants", { title: "Kit", inventory_items: [{ inventory_item_id: "inv_1" }] })).toBeNull()
})

it("lets a manager use their own account and dashboard view", () => {
  for (const [method, path] of [["GET", "/admin/users/me"], ["POST", "/admin/users/me/password"], ["GET", "/admin/rbac/me/permissions"], ["GET", "/admin/feature-flags"], ["GET", "/admin/layouts/sidebar/configuration"], ["DELETE", "/admin/layouts/sidebar/configuration"], ["GET", "/admin/views/product/configurations"]]) {
    expect(managerAction(method, path)).not.toBeNull()
  }
  expect(managerAction("POST", "/admin/layouts/sidebar/configuration", { is_default: false, configuration: { widgets: {} } })).not.toBeNull()
})

it("keeps shared dashboard views admin only", () => {
  expect(managerAction("POST", "/admin/layouts/sidebar/configuration", { is_default: true, configuration: { widgets: {} } })).toBeNull()
  expect(managerAction("POST", "/admin/views/product/configurations", { is_system_default: true })).toBeNull()
  expect(managerAction("POST", "/admin/views/product/configurations/vc_1", {})).toBeNull()
})

describe("existingVariantStockSettings", () => {
  it("finds stock settings sent for existing variants, wherever they are", () => {
    expect(existingVariantStockSettings("/admin/products/prod_1/variants/v1", { title: "x", manage_inventory: false })).toEqual([{ variantId: "v1", settings: { manage_inventory: false } }])
    expect(existingVariantStockSettings("/admin/products/prod_1", { variants: [{ id: "v2", allow_backorder: true }, { title: "new", manage_inventory: false }] }))
      .toEqual([{ variantId: "v2", settings: { allow_backorder: true } }])
    expect(existingVariantStockSettings("/admin/products/prod_1/variants/batch", { update: [{ id: "v3", manage_inventory: true, allow_backorder: false }] }))
      .toEqual([{ variantId: "v3", settings: { manage_inventory: true, allow_backorder: false } }])
  })

  it("ignores new variants and unrelated areas", () => {
    expect(existingVariantStockSettings("/admin/products/prod_1/variants", { manage_inventory: false })).toEqual([])
    expect(existingVariantStockSettings("/admin/products/prod_1/quick-variant", { manage_inventory: false })).toEqual([])
    expect(existingVariantStockSettings("/admin/products", { variants: [{ manage_inventory: false }] })).toEqual([])
    expect(existingVariantStockSettings("/admin/orders/order_1", { id: "x", manage_inventory: false })).toEqual([])
  })
})
