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
it("uses current database role assignments, not stale token roles", async () => {
  jest.mocked(hasPermission).mockResolvedValue(false)
  const req = { auth_context: { actor_id: "user_1", actor_type: "user", app_metadata: { roles: ["role_super_admin"] } }, method: "POST", originalUrl: "/admin/products", scope: { resolve: () => ({ graph: async () => ({ data: [{ id: "user_1", rbac_roles: [] }] }) }) } }
  await expect(adminAccess(req as never, {} as never, jest.fn())).rejects.toThrow()
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
