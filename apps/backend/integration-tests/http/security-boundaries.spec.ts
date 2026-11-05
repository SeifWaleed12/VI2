import { dirname, join } from "node:path"
import FormData from "form-data"
import sharp from "sharp"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys, generateJwtToken, Modules } from "@medusajs/framework/utils"
import { createOrderWorkflow, createUsersWorkflow, generateResetPasswordTokenWorkflow } from "@medusajs/medusa/core-flows"
import { setupEgyptStore } from "../../src/scripts/setup-egypt-store"
import { bindSecuritySession } from "../../src/lib/security-session"
import SecureEmailpassService from "../../src/modules/secure-emailpass/service"

// The email-change step needs a storefront address for its link.
process.env.STOREFRONT_URL ??= "http://localhost:3000"

const createSuperAdminRole = require(join(dirname(require.resolve("@medusajs/medusa")), "migration-scripts/create-super-admin-role")).default
const { generateTotpCode } = require(join(dirname(require.resolve("@medusajs/auth")), "utils/totp")) as { generateTotpCode: (input: { secret: string }) => string }
const password = "security-boundary-password"
const anyStatus = { validateStatus: () => true }
jest.setTimeout(240000)

medusaIntegrationTestRunner({ testSuite: ({ api, getContainer }) => {
  describe("security: native account and resource boundaries", () => {
    let key: string, token: string, customer: { id: string, email: string }
    const bearer = (value: string) => ({ headers: { authorization: `Bearer ${value}` }, ...anyStatus })
    const store = (value?: string) => ({ headers: { "x-publishable-api-key": key, ...(value ? { authorization: `Bearer ${value}` } : {}) }, ...anyStatus })
    const register = (email: string) => api.post("/store/auth/register", { email, password, first_name: "Dummy", last_name: "Buyer" }, store())
    beforeEach(async () => {
      const container = getContainer()
      await setupEgyptStore(container)
      for (const purpose of ["registration-attempts", "login-attempts", "reset-requests"]) await container.resolve(Modules.CACHE).invalidate(`${purpose}:*`)
      const { data: [publishable] } = await container.resolve(ContainerRegistrationKeys.QUERY).graph({ entity: "api_key", fields: ["token"], filters: { type: "publishable" } })
      key = publishable.token as string
      const result = await register("boundary-buyer@example.test")
      expect(result.status).toBe(201)
      token = result.data.token; customer = result.data.customer
    })
    async function admin() {
      const container = getContainer()
      const { result: [user] } = await createUsersWorkflow(container).run({ input: { users: [{ email: "boundary-admin@example.test" }] } })
      const auth = container.resolve(Modules.AUTH), registered = await auth.register("emailpass", { body: { email: user.email, password } })
      await auth.updateAuthIdentities({ id: registered.authIdentity!.id, app_metadata: { user_id: user.id } })
      await createSuperAdminRole({ container })
      const result = await api.post("/auth/user/emailpass", { email: user.email, password }, anyStatus)
      expect(result.status).toBe(200)
      return result.data.token as string
    }

    it("blocks alternate login actors/encoding and parallel customer-creation doors", async () => {
      for (let i = 0; i < 5; i++) expect((await api.post("/auth/customer/emailpass", { email: customer.email, password: "wrong" }, anyStatus)).status).toBe(401)
      expect((await api.post("/auth/customer/emailpass", { email: customer.email, password }, anyStatus)).status).toBe(429)
      for (const actor of ["probe", "%63ustomer"]) expect((await api.post(`/auth/${actor}/emailpass`, { email: customer.email, password }, anyStatus)).status).toBe(400)
      expect((await api.post("/auth/customer/emailpass/register", { email: "blocked@example.test", password }, anyStatus)).status).toBe(400)
      const container = getContainer(), registered = await container.resolve(Modules.AUTH).register("emailpass", { body: { email: "unbound@example.test", password } })
      const { http } = container.resolve(ContainerRegistrationKeys.CONFIG_MODULE).projectConfig
      const unbound = generateJwtToken({ actor_id: "", actor_type: "customer", auth_identity_id: registered.authIdentity!.id, auth_provider: "emailpass", app_metadata: registered.authIdentity!.app_metadata }, { secret: http.jwtSecret, expiresIn: "1h" })
      const blocked = await api.post("/store/customers", { email: "different@example.test" }, store(await bindSecuritySession(container, unbound)))
      expect(blocked.status).toBe(400)
      expect(blocked.data.message).toContain("/store/auth/register")
      expect(await getContainer().resolve(Modules.CUSTOMER).listCustomers({ email: "different@example.test" })).toHaveLength(0)
    })

    it.each([
      "/auth/customer/%65mailpass",
      "/auth/probe/%65mailpass",
      "/auth/customer/%65mailpass/reset-password",
      "/auth/customer/%65mailpass/register",
    ])("rejects encoded provider paths before password-provider work: %s", async path => {
      const authenticate = jest.spyOn(SecureEmailpassService.prototype, "authenticate")
      const registration = jest.spyOn(SecureEmailpassService.prototype, "register")
      const reset = jest.spyOn(getContainer().resolve(Modules.AUTH), "createPasswordResetToken")
      try {
        const result = await api.post(path, { email: customer.email, identifier: customer.email, password }, anyStatus)
        expect(result.status).toBe(400)
        expect(result.data.message).toContain("unescaped API path")
        expect(authenticate).not.toHaveBeenCalled()
        expect(registration).not.toHaveBeenCalled()
        expect(reset).not.toHaveBeenCalled()
        // Prove the spy covers the actual native provider, not a second copy.
        expect((await api.post("/auth/customer/emailpass", { email: customer.email, password }, anyStatus)).status).toBe(200)
        expect(authenticate).toHaveBeenCalledTimes(1)
      } finally { authenticate.mockRestore(); registration.mockRestore(); reset.mockRestore() }
    })

    it("revokes one device and rejects all old tokens/refreshes after native password reset", async () => {
      const other = await api.post("/auth/customer/emailpass", { email: customer.email, password }, anyStatus)
      expect(other.status).toBe(200)
      const refreshed = await api.post("/auth/token/refresh", {}, bearer(token))
      expect(refreshed.status).toBe(200)
      expect((await api.post("/auth/logout", {}, bearer(token))).status).toBe(200)
      expect((await api.get("/store/customers/me", store(token))).status).toBe(401)
      expect((await api.get("/store/customers/me", store(refreshed.data.token))).status).toBe(401)
      expect((await api.post("/auth/token/refresh", {}, bearer(token))).status).toBe(401)
      expect((await api.get("/store/customers/me", store(other.data.token))).status).toBe(200)
      const container = getContainer(), { http } = container.resolve(ContainerRegistrationKeys.CONFIG_MODULE).projectConfig
      const notifications = jest.spyOn(container.resolve(Modules.NOTIFICATION), "createNotifications")
      let emailToken: string
      try {
        expect((await api.post("/store/customers/me/email", { email: "replacement@example.test", password }, store(other.data.token))).status).toBe(200)
        const sent = notifications.mock.calls[0][0] as unknown as { template: string, content: { text: string } }[]
        emailToken = decodeURIComponent(/token=(\S+)/.exec(sent.find(message => message.template === "email-change-confirm")!.content.text)![1])
      } finally { notifications.mockRestore() }
      const { result: reset } = await generateResetPasswordTokenWorkflow(container).run({ input: { entityId: customer.email, actorType: "customer", provider: "emailpass", secret: http.jwtSecret as string } })
      expect((await api.post("/auth/customer/emailpass/update", { password: "replacement-security-password" }, bearer(reset))).status).toBe(200)
      expect((await api.get("/store/customers/me", store(other.data.token))).status).toBe(401)
      expect((await api.post("/auth/token/refresh", {}, bearer(other.data.token))).status).toBe(401)
      expect((await api.post("/store/email-change/confirm", { token: emailToken }, store())).status).toBe(400)
      const fresh = await api.post("/auth/customer/emailpass", { email: customer.email, password: "replacement-security-password" }, anyStatus)
      expect(fresh.status).toBe(200)
      expect((await api.post("/store/customers/me/password", { current_password: "replacement-security-password", new_password: "next-security-password" }, store(fresh.data.token))).status).toBe(200)
      expect((await api.get("/store/customers/me", store(fresh.data.token))).status).toBe(401)
      expect((await api.post("/auth/token/refresh", {}, bearer(fresh.data.token))).status).toBe(401)
    })

    it("rotates a planted session on staff login and rejects forged cookie mutations", async () => {
      const first = await api.post("/auth/session", {}, bearer(token))
      expect(first.status).toBe(200)
      const cookie = first.headers["set-cookie"][0].split(";")[0]
      const staff = await admin()
      const second = await api.post("/auth/session", {}, { headers: { authorization: `Bearer ${staff}`, cookie }, ...anyStatus })
      expect(second.status).toBe(200)
      const current = second.headers["set-cookie"][0].split(";")[0]
      expect(current).not.toBe(cookie)
      expect((await api.get("/admin/users/me", { headers: { cookie }, ...anyStatus })).status).toBe(401)
      expect((await api.get("/admin/users/me", { headers: { cookie: current }, ...anyStatus })).status).toBe(200)
      const mutation = (origin: string) => api.post("/admin/brands", "name=Dummy&slug=dummy", { headers: { cookie: current, origin, "content-type": "application/x-www-form-urlencoded" }, ...anyStatus })
      expect((await mutation("https://untrusted.example")).status).toBe(403)
      expect((await mutation(new URL(api.defaults.baseURL!).origin)).status).toBe(201)
    })

    async function rejectedAuthSurfaces(stale: string) {
      for (const [method, path, body] of [
        ["get", "/auth/mfa/factors", undefined],
        ["post", "/auth/mfa/factors", { provider: "totp" }],
        ["post", "/auth/mfa/factors/dummy/verify", { code: "123456" }],
        ["delete", "/auth/mfa/factors/dummy", undefined],
        ["post", "/auth/mfa/recovery-codes", {}],
        ["post", "/auth/mfa/challenges/dummy/verify", { method: "totp", code: "123456" }],
        ["post", "/auth/verification/request", { entity_id: "dummy@example.test", entity_type: "email" }],
        ["post", "/auth/verification/confirm", { code: "dummy" }],
        ["post", "/auth/emailpass/user", {}],
      ] as const) {
        const result = method === "get" ? await api.get(path, bearer(stale))
          : method === "delete" ? await api.delete(path, bearer(stale)) : await api.post(path, body, bearer(stale))
        expect({ path, status: result.status }).toEqual({ path, status: 401 })
      }
    }

    it("blocks revoked refresh lineage and recovered credentials on every native auth surface", async () => {
      const refreshed = await api.post("/auth/token/refresh", {}, bearer(token))
      expect(refreshed.status).toBe(200)
      expect((await api.post("/auth/logout", {}, bearer(token))).status).toBe(200)
      await rejectedAuthSurfaces(token)
      await rejectedAuthSurfaces(refreshed.data.token)
      const current = await api.post("/auth/customer/emailpass", { email: customer.email, password }, anyStatus)
      expect(current.status).toBe(200)
      const container = getContainer(), { http } = container.resolve(ContainerRegistrationKeys.CONFIG_MODULE).projectConfig
      const { result: reset } = await generateResetPasswordTokenWorkflow(container).run({ input: { entityId: customer.email, actorType: "customer", provider: "emailpass", secret: http.jwtSecret as string } })
      expect((await api.post("/auth/customer/emailpass/update", { password: "recovered-security-password" }, bearer(reset))).status).toBe(200)
      await rejectedAuthSurfaces(current.data.token)
    })

    it("preserves authenticated verification requests and code-only confirmation", async () => {
      const auth = getContainer().resolve(Modules.AUTH)
      const requests = jest.spyOn(auth, "requestAuthVerification")
      let code: string
      try {
        const requested = await api.post("/auth/verification/request", { entity_id: customer.email, entity_type: "email" }, bearer(token))
        expect(requested.status).toBe(201)
        code = (await requests.mock.results[0].value).code
        expect(typeof code).toBe("string")
      } finally { requests.mockRestore() }
      const confirmed = await api.post("/auth/verification/confirm", { code }, anyStatus)
      expect(confirmed.status).toBe(200)
      expect(confirmed.data.entity_id).toBe(customer.email)
      expect(confirmed.data.verified_at).toBeTruthy()
      expect((await api.post("/auth/verification/request", { entity_id: customer.email, entity_type: "email" }, anyStatus)).status).toBe(401)
    })

    it.each(["customer", "user"])("preserves %s MFA login, refresh and device revocation", async actor => {
      const initial = actor === "customer" ? token : await admin()
      const email = actor === "customer" ? customer.email : "boundary-admin@example.test"
      const enrollment = await api.post("/auth/mfa/factors", { provider: "totp" }, bearer(initial))
      expect(enrollment.status).toBe(200)
      const code = () => generateTotpCode({ secret: enrollment.data.secret })
      expect((await api.post(`/auth/mfa/factors/${enrollment.data.mfa_factor.id}/verify`, { code: code() }, bearer(initial))).status).toBe(200)
      const pending = await api.post(`/auth/${actor}/emailpass`, { email, password }, anyStatus)
      expect(pending.status).toBe(200)
      expect(pending.data.mfa_required).toBe(true)
      const protectedRequest = (value: string) => actor === "customer" ? api.get("/store/customers/me", store(value)) : api.get("/admin/users/me", bearer(value))
      expect((await protectedRequest(pending.data.token)).status).toBe(401)
      const verified = await api.post(`/auth/mfa/challenges/${pending.data.mfa_challenge.id}/verify`, { method: "totp", code: code() }, bearer(pending.data.token))
      expect(verified.status).toBe(200)
      expect((await protectedRequest(verified.data.token)).status).toBe(200)
      const claims = (value: string) => JSON.parse(Buffer.from(value.split(".")[1], "base64url").toString())
      expect(claims(verified.data.token).app_metadata.vi2_session_id).toBe(claims(pending.data.token).app_metadata.vi2_session_id)
      const refreshed = await api.post("/auth/token/refresh", {}, bearer(verified.data.token))
      expect(refreshed.status).toBe(200)
      expect((await protectedRequest(refreshed.data.token)).status).toBe(200)
      expect((await api.post("/auth/logout", {}, bearer(refreshed.data.token))).status).toBe(200)
      await rejectedAuthSurfaces(verified.data.token)
      await rejectedAuthSurfaces(pending.data.token)
      const abandoned = await api.post(`/auth/${actor}/emailpass`, { email, password }, anyStatus)
      expect(abandoned.data.mfa_required).toBe(true)
      const container = getContainer(), { http } = container.resolve(ContainerRegistrationKeys.CONFIG_MODULE).projectConfig
      const { result: reset } = await generateResetPasswordTokenWorkflow(container).run({ input: { entityId: email, actorType: actor, provider: "emailpass", secret: http.jwtSecret as string } })
      expect((await api.post(`/auth/${actor}/emailpass/update`, { password: "recovered-mfa-password" }, bearer(reset))).status).toBe(200)
      expect((await api.post(`/auth/mfa/challenges/${abandoned.data.mfa_challenge.id}/verify`, { method: "totp", code: code() }, bearer(abandoned.data.token))).status).toBe(401)
      await rejectedAuthSurfaces(initial)
    })

    it("rejects active uploads/presigned bypass and serves sniffed raster content", async () => {
      const staff = await admin()
      const upload = (content: Buffer, name: string, type: string) => {
        const data = new FormData(); data.append("files", content, { filename: name, contentType: type })
        return api.post("/admin/uploads", data, { headers: { ...data.getHeaders(), authorization: `Bearer ${staff}` }, ...anyStatus })
      }
      const active = await upload(Buffer.from("<html><script>dummy</script></html>"), "probe.html", "text/html")
      expect(active.status).toBe(400)
      expect(active.data.message).toContain("PNG")
      const presigned = await api.post("/admin/uploads/presigned-urls", { originalname: "probe.html", mime_type: "text/html", size: 32 }, bearer(staff))
      expect(presigned.status).toBe(400)
      expect(presigned.data.message).toContain("content validation")
      const photo = await sharp({ create: { width: 3000, height: 1200, channels: 3, background: "#4a7a3b" } }).withMetadata({ exif: { IFD0: { Copyright: "private camera data" } } }).jpeg().toBuffer()
      const result = await upload(photo, "misleading.html", "text/html")
      expect(result.status).toBe(200)
      expect(result.data.files[0].url).toMatch(/\/products\/[^/]+\.webp$/)
      const file = await api.get(new URL(result.data.files[0].url).pathname, { ...anyStatus, responseType: "arraybuffer" })
      expect(file.status).toBe(200)
      expect(file.headers["content-type"]).toContain("image/webp")
      const served = await sharp(Buffer.from(file.data)).metadata()
      expect([served.format, served.width, served.height, served.exif]).toEqual(["webp", 2000, 800, undefined])
      const tiny = await upload(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6K2AAAAAASUVORK5CYII=", "base64"), "tiny.png", "image/png")
      expect([tiny.status, tiny.data.message]).toEqual([400, "Images must be at least 600 px on their shorter side."])
      const png = await sharp({ create: { width: 800, height: 800, channels: 3, background: "#ffffff" } }).png().toBuffer()
      const oversized = await upload(Buffer.concat([png, Buffer.alloc(10 * 1024 * 1024)]), "oversized.png", "image/png")
      expect(oversized.status).toBe(400)
      expect(oversized.data.message).toContain("10 MB")
      const huge = await upload(Buffer.alloc(51 * 1024 * 1024), "huge.png", "image/png")
      expect([huge.status, huge.data.message]).toEqual([413, "Upload at most 50 MB at once."])
    })

    it("enforces cart ownership on case variants and projects public receipts", async () => {
      const container = getContainer(), query = container.resolve(ContainerRegistrationKeys.QUERY)
      const { data: [settings] } = await query.graph({ entity: "store", fields: ["default_region_id"] })
      const cart = await api.post("/store/carts", { region_id: settings.default_region_id }, store(token))
      expect(cart.status).toBe(200)
      expect(cart.data.cart.customer_id).toBe(customer.id)
      expect((await api.get(`/store/CARTS/${cart.data.cart.id}`, store())).status).toBe(403)
      expect((await api.get(`/store/carts/%63${cart.data.cart.id.slice(1)}`, store())).status).toBe(400)
      expect((await api.get(`/store/carts/${cart.data.cart.id}`, store(token))).status).toBe(200)
      const { result: order } = await createOrderWorkflow(container).run({ input: { region_id: settings.default_region_id as string, currency_code: "egp", customer_id: customer.id, email: customer.email, shipping_address: { first_name: "Private", last_name: "Buyer", address_1: "Private street", city: "Cairo", country_code: "eg", phone: "01000000000" }, items: [{ title: "Dummy item", quantity: 1, unit_price: 100, metadata: { private: "dummy-private-data" } }] } })
      const receipt = await api.get(`/store/orders/${order.id}?fields=email,*shipping_address,*items`, store())
      expect(receipt.status).toBe(200)
      expect(receipt.data.order.id).toBe(order.id)
      expect(receipt.data.order.email).toBeUndefined()
      expect(receipt.data.order.shipping_address).toBeUndefined()
      expect(receipt.data.order.items[0].metadata).toBeUndefined()
      const returnedItems = [{ id: order.items![0].id, quantity: 1 }]
      const returnBody = { order_id: order.id, items: returnedItems, return_shipping: { option_id: "so_dummy" } }
      expect((await api.post("/store/returns", returnBody, store())).status).toBe(401)
      expect((await api.post("/store/returns", { ...returnBody, receive_now: true }, store(token))).status).toBe(403)
      const other = await register("different-buyer@example.test")
      expect(other.status).toBe(201)
      expect((await api.post("/store/returns", returnBody, store(other.data.token))).status).toBe(403)
    })

    it("deletes the login of a legacy email-changed customer and allows registration again", async () => {
      const auth = getContainer().resolve(Modules.AUTH)
      const [provider] = await auth.listProviderIdentities({ provider: "emailpass", entity_id: customer.email }, { relations: ["auth_identity"] })
      await auth.updateAuthIdentities({ id: provider.auth_identity_id!, app_metadata: { ...provider.auth_identity!.app_metadata, email_changed_at: Date.now() - 1000 } })
      expect((await api.delete(`/admin/customers/${customer.id}`, bearer(await admin()))).status).toBe(200)
      expect(await auth.listProviderIdentities({ provider: "emailpass", entity_id: customer.email })).toHaveLength(0)
      expect((await api.get("/store/customers/me", store(token))).status).toBe(401)
      expect((await register(customer.email)).status).toBe(201)
    })

    it("bounds visitor registration work across custom and native staff routes", async () => {
      for (let i = 0; i < 9; i++) expect((await register(`bounded-${i}@example.test`)).status).toBe(201)
      expect((await register("bounded-over-budget@example.test")).status).toBe(429)
      expect((await api.post("/auth/user/emailpass/register", { email: "staff-over-budget@example.test", password }, anyStatus)).status).toBe(429)
    })
  })
} })
