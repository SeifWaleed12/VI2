import { managerPolicyGrants } from "../manager-role"

const keys = () => managerPolicyGrants().map(({ resource, operation }) => `${resource}:${operation}`)

it("grants full use of orders, catalog, customers and marketing", () => {
  expect(keys()).toEqual(expect.arrayContaining([
    "order:read", "order:create", "order:update", "order:delete",
    "fulfillment:create", "payment:update", "refund:create", "capture:create", "return:create",
    "product:delete", "product_variant:update", "price:create", "price:*", "brand:delete", "brand:create",
    "product_type:create", "product_tag:update", "customer:create", "promotion:update", "price_list:create",
  ]))
})

it("lets managers see stock and reference data without changing them", () => {
  expect(keys()).toEqual(expect.arrayContaining(["inventory_item:read", "inventory_item:create", "store:read", "region:read", "sales_channel:read"]))
  expect(keys().filter((key) => /^(inventory_item|inventory_level|store|region|sales_channel|stock_location):(\*|update|delete)$/.test(key))).toEqual([])
})

it("never grants admin-only resources", () => {
  for (const resource of ["api_key", "user", "invite", "rbac_role", "rbac_policy", "workflow_execution", "tax_rate"]) {
    expect(keys().filter((key) => key.startsWith(`${resource}:`))).toEqual([])
  }
  expect(keys()).not.toContain("*:*")
})

it("only grants \"*\" where code defines it, because Medusa deletes undefined permissions", () => {
  expect(keys().filter((key) => key.endsWith(":*"))).toEqual(["price:*"])
})

it("lists each permission once", () => {
  expect(new Set(keys()).size).toBe(keys().length)
})
