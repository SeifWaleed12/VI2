// Without the RBAC module, the rbac flag still enforces permissions but no role
// can exist, which locks every staff user out of the admin.
it("loads the RBAC module, not only the rbac flag", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const config = require("../../medusa-config")
  expect(config.featureFlags).toEqual(expect.objectContaining({ rbac: true }))
  expect(config.modules.rbac).toBeDefined()
  expect(config.modules.rbac.disable).toBeFalsy()
})
