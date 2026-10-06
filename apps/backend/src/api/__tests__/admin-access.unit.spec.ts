import { adminAccess, unlessInviteAcceptance } from "../admin-access"
import { hasPermission } from "@medusajs/framework"

jest.mock("@medusajs/framework", () => ({ hasPermission: jest.fn() }))

type Variant = { id: string, manage_inventory: boolean, allow_backorder: boolean }

function request(roles: string[], overrides: { method?: string, originalUrl?: string, body?: unknown, variants?: Variant[] } = {}) {
  const graph = jest.fn(async ({ entity }: { entity: string }) => ({
    data: entity === "user" ? [{ id: "user_1", rbac_roles: roles.map((id) => ({ id })) }] : overrides.variants ?? [],
  }))
  return {
    auth_context: { actor_id: "user_1", actor_type: "user", app_metadata: { roles: ["role_super_admin"] } },
    method: overrides.method ?? "POST",
    originalUrl: overrides.originalUrl ?? "/admin/brands",
    body: overrides.body ?? { name: "X", slug: "x" },
    scope: { resolve: () => ({ graph }) },
    graph,
  }
}
const response = () => ({ locals: {} as Record<string, unknown> })
// The first hasPermission call asks "is this an administrator?"; the second
// checks the manager's permission for the action.
const asManager = () => jest.mocked(hasPermission).mockResolvedValueOnce(false).mockResolvedValueOnce(true)

beforeEach(() => jest.mocked(hasPermission).mockReset())

it("rejects unauthenticated requests before resolving permissions", async () => {
  await expect(adminAccess({} as never, response() as never, jest.fn())).rejects.toThrow("authentication")
})

it("uses current database role assignments, not stale token roles", async () => {
  jest.mocked(hasPermission).mockResolvedValue(false)
  const req = request(["role_manager"], { method: "GET", originalUrl: "/admin/api-keys" })
  await expect(adminAccess(req as never, response() as never, jest.fn())).rejects.toThrow("administrator")
  expect(req.auth_context.app_metadata.roles).toEqual(["role_manager"])
})

it("denies staff with no role even though Medusa's hasPermission allows an empty role list", async () => {
  // Medusa 2.21 returns true from hasPermission when the role list is empty.
  jest.mocked(hasPermission).mockResolvedValue(true)
  const next = jest.fn()
  const req = request([])
  await expect(adminAccess(req as never, response() as never, next)).rejects.toThrow("assigned role")
  expect(next).not.toHaveBeenCalled()
})

it("records whether the user is an administrator or a manager", async () => {
  jest.mocked(hasPermission).mockResolvedValueOnce(true)
  const adminRes = response()
  await adminAccess(request(["role_super_admin"]) as never, adminRes as never, jest.fn())
  expect(adminRes.locals.staffRole).toBe("admin")
  asManager()
  const managerRes = response()
  await adminAccess(request(["role_manager"], { method: "GET", originalUrl: "/admin/orders" }) as never, managerRes as never, jest.fn())
  expect(managerRes.locals.staffRole).toBe("manager")
})

it("refuses a manager an admin-only area even when Medusa's policies would allow it", async () => {
  jest.mocked(hasPermission).mockResolvedValueOnce(false).mockResolvedValue(true)
  const req = request(["role_manager"], { method: "GET", originalUrl: "/admin/api-keys/apk_1" })
  await expect(adminAccess(req as never, response() as never, jest.fn())).rejects.toThrow("administrator")
})

const variant = { id: "variant_1", manage_inventory: true, allow_backorder: false }

it("lets a manager resend a variant's unchanged stock settings", async () => {
  asManager()
  const next = jest.fn()
  const req = request(["role_manager"], { originalUrl: "/admin/products/prod_1/variants/variant_1", body: { title: "1kg", manage_inventory: true, allow_backorder: false }, variants: [variant] })
  await adminAccess(req as never, response() as never, next)
  expect(next).toHaveBeenCalled()
})

it.each([
  ["/admin/products/prod_1/variants/variant_1", { manage_inventory: false }],
  ["/admin/products/prod_1/variants/variant_1", { allow_backorder: true }],
  ["/admin/products/prod_1", { variants: [{ id: "variant_1", allow_backorder: true }] }],
  ["/admin/products/prod_1/variants/batch", { update: [{ id: "variant_1", manage_inventory: false }] }],
])("refuses a manager changing an existing variant's stock settings: %s %j", async (originalUrl, body) => {
  asManager()
  const next = jest.fn()
  const req = request(["role_manager"], { originalUrl, body, variants: [variant] })
  await expect(adminAccess(req as never, response() as never, next)).rejects.toThrow("Stock settings")
  expect(next).not.toHaveBeenCalled()
})

it("does not look up stock settings for a new variant", async () => {
  asManager()
  const next = jest.fn()
  const req = request(["role_manager"], { originalUrl: "/admin/products/prod_1/variants", body: { title: "2kg", manage_inventory: false } })
  await adminAccess(req as never, response() as never, next)
  expect(next).toHaveBeenCalled()
  expect(req.graph).toHaveBeenCalledTimes(1)
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
