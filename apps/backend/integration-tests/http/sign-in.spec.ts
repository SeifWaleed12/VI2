import { dirname, join } from "path"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createApiKeysWorkflow, createUsersWorkflow, generateResetPasswordTokenWorkflow } from "@medusajs/medusa/core-flows"
import setupCatalogManager from "../../src/scripts/setup-catalog-manager"

const medusaDist = dirname(require.resolve("@medusajs/medusa"))
// eslint-disable-next-line @typescript-eslint/no-require-imports
const createSuperAdminRole = require(join(medusaDist, "migration-scripts", "create-super-admin-role")).default

// Emails need absolute addresses for their links.
process.env.MEDUSA_BACKEND_URL = "http://localhost:9000"
process.env.STOREFRONT_URL = "http://localhost:3000"

jest.setTimeout(240 * 1000)

const password = "test-password-123"
const newPassword = "new-password-456"
const anyStatus = { validateStatus: () => true }
const bearer = (token: string) => ({ headers: { authorization: `Bearer ${token}` }, validateStatus: () => true })

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("sign-in hardening for staff and customers over HTTP", () => {
      let admin: ReturnType<typeof bearer>
      let managerRoleId: string
      let publishableKey: string

      beforeEach(async () => {
        const container = getContainer()
        // The server and its in-memory cache outlive each test's database.
        const cache = container.resolve(Modules.CACHE)
        await cache.invalidate("login-attempts:*")
        await cache.invalidate("reset-requests:*")
        const { result: [user] } = await createUsersWorkflow(container).run({ input: { users: [{ email: "admin@test.dev" }] } })
        const auth = container.resolve(Modules.AUTH)
        const { authIdentity } = await auth.register("emailpass", { body: { email: "admin@test.dev", password } })
        await auth.updateAuthIdentities({ id: authIdentity!.id, app_metadata: { user_id: user.id } })
        await createSuperAdminRole({ container })
        await setupCatalogManager({ container, args: [user.id] } as never)
        const [role] = await container.resolve(Modules.RBAC).listRbacRoles({ name: "Catalog Manager" })
        managerRoleId = role.id
        const { result: [key] } = await createApiKeysWorkflow(container).run({ input: { api_keys: [{ title: "Storefront", type: "publishable", created_by: user.id }] } })
        publishableKey = key.token
        const { data } = await api.post("/auth/user/emailpass", { email: "admin@test.dev", password })
        admin = bearer(data.token)
      })

      const signIn = (actor: "user" | "customer", email: string, pass: string) =>
        api.post(`/auth/${actor}/emailpass`, { email, password: pass }, anyStatus)
      const store = (token?: string) => ({
        headers: { "x-publishable-api-key": publishableKey, ...(token ? { authorization: `Bearer ${token}` } : {}) },
        validateStatus: () => true,
      })
      async function registerCustomer(email = "shopper@test.dev") {
        const response = await api.post("/store/auth/register", { email, password, first_name: "Shop", last_name: "Per" }, store())
        expect(response.status).toBe(201)
      }
      async function waitForNotifications(filter: Record<string, string>) {
        const notifications = getContainer().resolve(Modules.NOTIFICATION)
        for (let i = 0; i < 50; i++) {
          // A notification is stored as pending first, then marked with the send result.
          const sent = await notifications.listNotifications(filter)
          if (sent.length && sent.every((notification) => notification.status !== "pending")) return sent
          await new Promise((resolve) => setTimeout(resolve, 100))
        }
        return []
      }

      it("blocks a sixth staff attempt, even with the right password, and says when to retry", async () => {
        for (let i = 0; i < 5; i++) expect((await signIn("user", "Admin@test.dev", "wrong-password")).status).toBe(401)
        const blocked = await signIn("user", "admin@test.dev", password)
        expect(blocked.status).toBe(429)
        expect(blocked.headers["retry-after"]).toBe("900")
        expect(blocked.data.message).toContain("Too many attempts")
      })

      it("starts the count again after a successful sign-in", async () => {
        for (let i = 0; i < 4; i++) await signIn("user", "admin@test.dev", "wrong-password")
        expect((await signIn("user", "admin@test.dev", password)).status).toBe(200)
        for (let i = 0; i < 4; i++) expect((await signIn("user", "admin@test.dev", "wrong-password")).status).toBe(401)
        expect((await signIn("user", "admin@test.dev", password)).status).toBe(200)
      })

      // Medusa also signs in through GET with the same body; it must share the limit.
      const signInWithGet = (actor: "user" | "customer", email: string, pass: string) =>
        api.get(`/auth/${actor}/emailpass`, { data: { email, password: pass }, headers: { "content-type": "application/json" }, validateStatus: () => true })

      it.each(["user", "customer"] as const)("counts %s sign-ins through GET and blocks them during a lockout", async (actor) => {
        const email = actor === "user" ? "admin@test.dev" : "shopper@test.dev"
        if (actor === "customer") await registerCustomer()
        // Guesses through GET use up the same budget as POST.
        for (let i = 0; i < 5; i++) expect((await signInWithGet(actor, email, "wrong-password")).status).toBe(401)
        expect((await signIn(actor, email, password)).status).toBe(429)
        // And during a lockout, the right password through GET is refused too.
        expect((await signInWithGet(actor, email, password)).status).toBe(429)
      })

      it("blocks a customer account after five attempts without affecting other accounts", async () => {
        await registerCustomer()
        await registerCustomer("other@test.dev")
        for (let i = 0; i < 5; i++) expect((await signIn("customer", "shopper@test.dev", "wrong-password")).status).toBe(401)
        expect((await signIn("customer", "shopper@test.dev", password)).status).toBe(429)
        expect((await signIn("customer", "other@test.dev", password)).status).toBe(200)
        expect((await signIn("user", "admin@test.dev", password)).status).toBe(200)
      })

      it("rejects a short password on every route that sets one, without creating an identity", async () => {
        const staff = await api.post("/auth/user/emailpass/register", { email: "weak@test.dev", password: "seven77" }, anyStatus)
        expect(staff.status).toBe(400)
        expect(staff.data.message).toContain("at least 8")
        expect((await api.post("/auth/customer/emailpass/register", { email: "weak@test.dev", password: "seven77" }, anyStatus)).status).toBe(400)
        expect((await api.post("/store/auth/register", { email: "weak@test.dev", password: "seven77", first_name: "W", last_name: "K" }, store())).status).toBe(400)
        const identities = await getContainer().resolve(Modules.AUTH).listProviderIdentities({ entity_id: "weak@test.dev" })
        expect(identities).toEqual([])
      })

      it("rejects a short password on a staff reset link and accepts a good one", async () => {
        const container = getContainer()
        const { http } = container.resolve(ContainerRegistrationKeys.CONFIG_MODULE).projectConfig
        const { result: token } = await generateResetPasswordTokenWorkflow(container).run({
          input: { entityId: "admin@test.dev", actorType: "user", provider: "emailpass", secret: http.jwtSecret as string },
        })
        expect((await api.post("/auth/user/emailpass/update", { password: "short" }, bearer(token))).status).toBe(400)
        expect((await signIn("user", "admin@test.dev", password)).status).toBe(200)
        expect((await api.post("/auth/user/emailpass/update", { password: newPassword }, bearer(token))).status).toBe(200)
        expect((await signIn("user", "admin@test.dev", newPassword)).status).toBe(200)
      })

      it("emails a customer reset link, and limits the requests", async () => {
        await registerCustomer()
        const request = () => api.post("/auth/customer/emailpass/reset-password", { identifier: "shopper@test.dev" }, anyStatus)
        expect((await request()).status).toBe(201)
        const sent = await waitForNotifications({ to: "shopper@test.dev" })
        expect(sent).toEqual([expect.objectContaining({ channel: "email", template: "password-reset", resource_type: "customer", status: "success" })])
        for (let i = 0; i < 4; i++) expect((await request()).status).toBe(201)
        expect((await request()).status).toBe(429)
        // Reset requests have their own budget; the customer can still sign in.
        expect((await signIn("customer", "shopper@test.dev", password)).status).toBe(200)
      })

      it("answers a reset request for an unknown email the same way, without sending anything", async () => {
        expect((await api.post("/auth/customer/emailpass/reset-password", { identifier: "nobody@test.dev" }, anyStatus)).status).toBe(201)
        expect(await getContainer().resolve(Modules.NOTIFICATION).listNotifications({ to: "nobody@test.dev" })).toEqual([])
      })

      it("lets a customer change their password with the current one", async () => {
        await registerCustomer()
        const { data } = await signIn("customer", "shopper@test.dev", password)
        const change = (body: Record<string, string>) => api.post("/store/customers/me/password", body, store(data.token))
        const wrong = await change({ current_password: "not-it-at-all", new_password: newPassword })
        expect(wrong.status).toBe(400)
        expect(wrong.data.code).toBe("wrong_password")
        const weak = await change({ current_password: password, new_password: "short" })
        expect(weak.status).toBe(400)
        expect(weak.data.code).toBe("weak_password")
        expect((await change({ current_password: password, new_password: newPassword })).status).toBe(200)
        expect((await signIn("customer", "shopper@test.dev", password)).status).toBe(401)
        expect((await signIn("customer", "shopper@test.dev", newPassword)).status).toBe(200)
      })

      it("counts wrong current passwords toward the sign-in limit", async () => {
        await registerCustomer()
        const { data } = await signIn("customer", "shopper@test.dev", password)
        for (let i = 0; i < 5; i++) {
          const response = await api.post("/store/customers/me/password", { current_password: "guess-number", new_password: newPassword }, store(data.token))
          expect(response.status).toBe(400)
        }
        expect((await api.post("/store/customers/me/password", { current_password: password, new_password: newPassword }, store(data.token))).status).toBe(429)
        expect((await signIn("customer", "shopper@test.dev", password)).status).toBe(429)
      })

      it("needs a signed-in customer to change a password", async () => {
        expect((await api.post("/store/customers/me/password", { current_password: password, new_password: newPassword }, store())).status).toBe(401)
      })

      it("emails an invite with the manager role; the manager signs in and changes their own password", async () => {
        const created = await api.post("/admin/invites", { email: "new.manager@test.dev", roles: [managerRoleId] }, admin)
        expect(created.status).toBe(200)
        const inviteId = created.data.invite.id
        const sent = await waitForNotifications({ resource_id: inviteId })
        expect(sent).toEqual([expect.objectContaining({ channel: "email", to: "new.manager@test.dev", status: "success" })])

        const query = getContainer().resolve(ContainerRegistrationKeys.QUERY)
        const { data: [invite] } = await query.graph({ entity: "invite", fields: ["token"], filters: { id: inviteId } })
        expect((await api.post("/auth/user/emailpass/register", { email: "new.manager@test.dev", password: "manager" }, anyStatus)).status).toBe(400)
        const registered = await api.post("/auth/user/emailpass/register", { email: "new.manager@test.dev", password })
        const accepted = await api.post(`/admin/invites/accept?token=${invite.token}`, { first_name: "New", last_name: "Manager" }, bearer(registered.data.token))
        expect(accepted.status).toBe(200)

        const { data } = await signIn("user", "new.manager@test.dev", password)
        const manager = bearer(data.token)
        expect((await api.get("/admin/products", manager)).status).toBe(200)
        expect((await api.get("/admin/api-keys", manager)).status).toBe(403)
        expect((await api.post("/admin/users/me/password", { current_password: password, new_password: newPassword }, manager)).status).toBe(200)
        expect((await signIn("user", "new.manager@test.dev", newPassword)).status).toBe(200)
      })
    })
  },
})
