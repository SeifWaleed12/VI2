import { adminAccess, managerAction, unlessInviteAcceptance } from "../admin-access"
import { hasPermission } from "@medusajs/framework"

jest.mock("@medusajs/framework", () => ({ hasPermission: jest.fn() }))

it.each(["/admin/orders", "/admin/customers", "/admin/users", "/admin/rbac/roles", "/admin/api-keys", "/admin/payments", "/admin/products/export"])("denies manager access to %s", (path) => {
  expect(managerAction("GET", path)).toBeNull()
  expect(managerAction("POST", path)).toBeNull()
})
it.each(["/admin/products/prod_1", "/admin/brands/brand_1"])("permits catalog edits but never deletion: %s", (path) => {
  expect(managerAction("POST", path)?.operation).toBe("update")
  expect(managerAction("DELETE", path)).toBeNull()
  expect(managerAction("POST", path, { delete: ["id"] })).toBeNull()
})
it("allows product and brand creation", () => {
  expect(managerAction("POST", "/admin/products")).toEqual({ resource: "product", operation: "create" })
  expect(managerAction("POST", "/admin/brands")).toEqual({ resource: "brand", operation: "create" })
})
it("rejects unauthenticated requests before resolving permissions", async () => {
  await expect(adminAccess({} as never, {} as never, jest.fn())).rejects.toThrow("authentication")
})
const request = (roles: string[]) => ({ auth_context: { actor_id: "user_1", actor_type: "user", app_metadata: { roles: ["role_super_admin"] } }, method: "POST", originalUrl: "/admin/brands", body: { name: "X", slug: "x" }, scope: { resolve: () => ({ graph: async () => ({ data: [{ id: "user_1", rbac_roles: roles.map((id) => ({ id })) }] }) }) } })

it("uses current database role assignments, not stale token roles", async () => {
  jest.mocked(hasPermission).mockResolvedValue(false)
  const req = request(["role_catalog"])
  req.originalUrl = "/admin/orders"
  await expect(adminAccess(req as never, {} as never, jest.fn())).rejects.toThrow()
  expect(req.auth_context.app_metadata.roles).toEqual(["role_catalog"])
})
it("denies staff with no role even though Medusa's hasPermission allows an empty role list", async () => {
  // Medusa 2.21 returns true from hasPermission when the role list is empty.
  jest.mocked(hasPermission).mockResolvedValue(true)
  const next = jest.fn()
  const req = request([])
  await expect(adminAccess(req as never, {} as never, next)).rejects.toThrow("assigned role")
  expect(next).not.toHaveBeenCalled()
  expect(req.auth_context.app_metadata.roles).toEqual([])
})
it("lets only invite acceptance bypass the global admin guard", () => {
  const guard = jest.fn()
  const wrapped = unlessInviteAcceptance(guard)
  const next = jest.fn()
  wrapped({ method: "POST", originalUrl: "/admin/invites/accept?token=x" } as never, {} as never, next)
  expect(next).toHaveBeenCalled()
  expect(guard).not.toHaveBeenCalled()
  for (const req of [{ method: "GET", originalUrl: "/admin/invites/accept" }, { method: "POST", originalUrl: "/admin/invites" }, { method: "POST", originalUrl: "/admin/invites/accept/x" }]) {
    wrapped(req as never, {} as never, next)
  }
  expect(guard).toHaveBeenCalledTimes(3)
})
it.each([
  ["POST", "/admin/products", { title: "Whey", status: "published" }],
  ["POST", "/admin/products", { title: "Whey", variants: [{ title: "1kg", prices: [{ amount: 100, currency_code: "egp" }] }] }],
  ["POST", "/admin/products/prod_1", { status: "published" }],
  ["POST", "/admin/products/prod_1", { status: "draft", variants: [{ id: "v1", prices: [] }] }],
  ["POST", "/admin/products/prod_1/variants/v1", { prices: [{ amount: 1, currency_code: "egp" }] }],
  ["POST", "/admin/products/prod_1/variants", { title: "2kg", inventory_items: [{ inventory_item_id: "i1" }] }],
  ["POST", "/admin/products/prod_1/quick-variant", { option_title: "Size", option_value: "1kg", prices: [{ amount: 1, currency_code: "egp" }] }],
  ["POST", "/admin/products/prod_1", { status: "draft" }],
  ["POST", "/admin/products/prod_1", { title: "Whey", status: "draft" }],
  ["POST", "/admin/products/prod_1/variants/v1", { manage_inventory: false }],
  ["POST", "/admin/products/prod_1/variants/v1", { allow_backorder: true }],
  ["POST", "/admin/products/prod_1", { variants: [{ id: "v1", allow_backorder: true }] }],
  ["POST", "/admin/products", { title: "Whey", status: "draft", variants: [{ title: "1kg", manage_inventory: false }] }],
])("denies catalog managers pricing, stock, and publishing changes: %s %s %j", (method, path, body) => {
  expect(managerAction(method, path, body)).toBeNull()
})
it("allows catalog managers to create drafts and edit content", () => {
  expect(managerAction("POST", "/admin/products", { title: "Whey", status: "draft", images: [{ url: "https://x/y.png" }] })).toEqual({ resource: "product", operation: "create" })
  expect(managerAction("POST", "/admin/products/prod_1", { description: "New copy", thumbnail: "https://x/y.png" })).toEqual({ resource: "product", operation: "update" })
  expect(managerAction("POST", "/admin/brands/brand_1", { status: "inactive" })?.operation).toBe("update")
})
