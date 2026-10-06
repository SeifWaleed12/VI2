import { MANAGER_HIDDEN_ENTRIES, managerLayoutView, withHiddenEntries } from "../manager-layouts"

const settings = MANAGER_HIDDEN_ENTRIES["settings.sidebar"]

it("hides every admin-only settings page but keeps product types, tags and the manager's own pages", () => {
  expect(settings).toEqual(expect.arrayContaining(["core:settings-nav:/settings/store", "core:settings-nav:/settings/users", "core:settings-nav:/settings/secret-api-keys", "core:settings-nav:/settings/workflows"]))
  for (const kept of ["product-types", "product-tags", "profile", "change-password"]) {
    expect(settings).not.toContain(`core:settings-nav:/settings/${kept}`)
  }
})

it("marks entries hidden in both views and keeps the user's other choices", () => {
  const body = {
    personal_configuration: { id: "lc_1", configuration: { widgets: { "core:settings-nav:/settings/store": { order: 2 }, "core:other": { order: 1 } } } },
    default_configuration: null,
    active_scope: "personal",
  }
  const result = withHiddenEntries(body, ["core:settings-nav:/settings/store"])
  expect(result.personal_configuration?.configuration?.widgets).toEqual({
    "core:settings-nav:/settings/store": { order: 2, hidden: true },
    "core:other": { order: 1 },
  })
  expect(result.default_configuration?.configuration?.widgets).toEqual({ "core:settings-nav:/settings/store": { hidden: true } })
  expect(result.active_scope).toBe("personal")
})

function run(staffRole: string | undefined, url: string) {
  const sent: unknown[] = []
  const res = { locals: { staffRole }, json: (body: unknown) => { sent.push(body); return res } }
  const next = jest.fn()
  managerLayoutView({ originalUrl: url } as never, res as never, next)
  res.json({ personal_configuration: null, default_configuration: null, active_scope: "default" })
  return { next, sent: sent[0] as { default_configuration: { configuration: { widgets: Record<string, unknown> } } | null } }
}

it("changes the layout only for managers", () => {
  const manager = run("manager", "/admin/layouts/settings.sidebar/configuration")
  expect(manager.next).toHaveBeenCalled()
  expect(Object.keys(manager.sent.default_configuration!.configuration.widgets)).toEqual(settings)
  expect(run("admin", "/admin/layouts/settings.sidebar/configuration").sent.default_configuration).toBeNull()
  expect(run("manager", "/admin/products").sent.default_configuration).toBeNull()
  expect(run("manager", "/admin/layouts/unknown/configuration").sent.default_configuration).toBeNull()
})
