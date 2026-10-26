import { dirname, join } from "node:path"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createProductsWorkflow, createUsersWorkflow } from "@medusajs/medusa/core-flows"
import { setupEgyptStore } from "../../src/scripts/setup-egypt-store"
import { readCatalogState } from "../../src/lib/catalog-ranking"
import setupCatalogManager from "../../src/scripts/setup-catalog-manager"
import { PRODUCT_REVIEW_MODULE } from "../../src/modules/product-review"
import type ProductReviewModuleService from "../../src/modules/product-review/service"

jest.setTimeout(240_000)
const medusaDist = dirname(require.resolve("@medusajs/medusa"))
// eslint-disable-next-line @typescript-eslint/no-require-imports
const createSuperAdminRole = require(join(medusaDist, "migration-scripts", "create-super-admin-role")).default
const password = "review-test-password"
const clean = { rating: 1, title: "Not for me", content: "This did not help me and made my stomach hurt." }

medusaIntegrationTestRunner({
  dbName: "vi2_reviews_http_20261026",
  testSuite: ({ api, getContainer }) => {
    let productId: string
    let draftId: string
    let hiddenId: string
    let publishableKey: string
    const store = (token?: string) => ({ headers: { "x-publishable-api-key": publishableKey, ...(token ? { authorization: `Bearer ${token}` } : {}) }, validateStatus: () => true })
    const endpoint = () => `/store/products/${productId}/reviews`
    const reviews = () => getContainer().resolve<ProductReviewModuleService>(PRODUCT_REVIEW_MODULE)
    const register = async (email: string, name = "Sara") => {
      const response = await api.post("/store/auth/register", { email, password, first_name: name, last_name: "Private" }, store())
      expect(response.status).toBe(201)
      const token = response.data.token as string
      const me = await api.get("/store/customers/me", store(token))
      return { token, id: me.data.customer.id as string }
    }
    beforeAll(async () => {
      // Match the native catalog test: seeding must finish before snapshotting connections.
      for (let attempt = 0; attempt < 120; attempt++) {
        if ((await readCatalogState(getContainer()).catch(() => undefined))?.ready === 1) return
        await new Promise(resolve => setTimeout(resolve, 250))
      }
      throw new Error("Native catalog index did not initialize")
    })
    beforeEach(async () => {
      const container = getContainer()
      await setupEgyptStore(container)
      const query = container.resolve(ContainerRegistrationKeys.QUERY)
      const { data: [settings] } = await query.graph({ entity: "store", fields: ["default_sales_channel_id"] })
      const { data: [key] } = await query.graph({ entity: "api_key", fields: ["token"], filters: { type: "publishable" } })
      publishableKey = key.token as string
      const { result: products } = await createProductsWorkflow(container).run({ input: { products: [
        { title: "Reviewable product", status: "published" as const, sales_channels: [{ id: settings.default_sales_channel_id as string }] },
        { title: "Draft product", status: "draft" as const, sales_channels: [{ id: settings.default_sales_channel_id as string }] },
        { title: "Another channel product", status: "published" as const, sales_channels: [] },
      ].map(product => ({ ...product, options: [{ title: "Size", values: ["Single"] }] })) } })
      ;[productId, draftId, hiddenId] = products.map(product => product.id)
    })

    it("opens reviews to signed-in non-buyers, screens locally, protects identity and permits withdrawal", async () => {
      const sara = await register("sara@reviews.test", "Sara Private")
      const other = await register("omar@reviews.test")
      expect((await api.post(endpoint() + "/me", clean, store())).status).toBe(401)
      expect((await api.get(endpoint() + "/me", store())).status).toBe(401)
      expect((await api.post(endpoint() + "/me", { ...clean, customer_id: other.id }, store(sara.token))).status).toBe(400)
      for (const id of [draftId, hiddenId, "prod_missing"]) {
        expect((await api.get(`/store/products/${id}/reviews`, store())).status).toBe(404)
        expect((await api.post(`/store/products/${id}/reviews/me`, clean, store(sara.token))).status).toBe(404)
      }
      expect((await api.get(endpoint() + "?limit=21", store())).status).toBe(400)
      const parallel = await Promise.all([api.post(endpoint() + "/me", clean, store(sara.token)), api.post(endpoint() + "/me", clean, store(sara.token))])
      expect(parallel.map(response => response.status)).toEqual([200, 200])
      expect(new Set(parallel.map(response => response.data.review.id)).size).toBe(1)
      const initial = parallel[0].data.review
      expect(initial).toMatchObject({ status: "approved", version: 1, first_name: "Sara" })
      expect((await api.get("/store/orders", store(sara.token))).data.orders).toHaveLength(0)
      const published = await api.get(endpoint(), store())
      expect(published.data.summary).toMatchObject({ count: 1, average: 1 })
      expect(published.data.reviews[0]).not.toHaveProperty("customer_id")
      expect(published.data.reviews[0]).not.toHaveProperty("moderation_reason")
      expect(published.data.reviews[0]).not.toHaveProperty("flags")
      expect(JSON.stringify(published.data)).not.toContain("Private")
      expect((await api.get(endpoint() + "/me", store(other.token))).data.review).toBeNull()
      expect((await api.delete(endpoint() + "/me", { ...store(other.token), data: { version: 1 } })).status).toBe(409)
      const flagged = await api.post(endpoint() + "/me", { ...clean, content: "This is fucking awful and I did not like it.", version: initial.version }, store(sara.token))
      expect(flagged.data.review).toMatchObject({ status: "pending", version: 2 })
      expect((await api.get(endpoint(), store())).data.summary.count).toBe(0)
      expect((await api.post(endpoint() + "/me", { ...clean, version: 1 }, store(sara.token))).status).toBe(409)
      const withdrawn = await api.delete(endpoint() + "/me", { ...store(sara.token), data: { version: 2 } })
      expect(withdrawn.data.review.status).toBe("withdrawn")
      const recreated = await api.post(endpoint() + "/me", { ...clean, version: withdrawn.data.review.version }, store(sara.token))
      expect(recreated.data.review.id).toBe(initial.id)
      expect(recreated.data.review.status).toBe("approved")
    })

    it("counts and orders approved reviews before pagination, excludes private states, and bounds writes", async () => {
      const seed = Array.from({ length: 31 }, (_, i) => ({ product_id: productId, customer_id: `cus_fixture_${i}`, first_name: "Member", rating: i % 5 + 1, title: null, content: "A sufficiently detailed review.", status: "approved" as const }))
      await reviews().createProductReviews(seed)
      await reviews().createProductReviews({ product_id: productId, customer_id: "cus_pending", rating: 5, content: "Do not publish this pending review.", status: "pending" })
      await reviews().createProductReviews({ product_id: productId, customer_id: "cus_rejected", rating: 5, content: "Do not publish this rejected review.", status: "rejected" })
      const first = await api.get(endpoint() + "?sort=highest&limit=10", store())
      const second = await api.get(endpoint() + "?sort=highest&limit=10&offset=10", store())
      expect(first.data).toMatchObject({ count: 31, limit: 10, offset: 0, summary: { count: 31 } })
      expect(first.data.reviews).toHaveLength(10)
      expect(first.data.reviews[9].rating).toBeGreaterThanOrEqual(second.data.reviews[0].rating)
      expect(new Set([...first.data.reviews, ...second.data.reviews].map(review => review.id)).size).toBe(20)
      const filtered = await api.get(endpoint() + "?rating=1&sort=lowest", store())
      expect(filtered.data.count).toBe(7)
      expect(filtered.data.summary.distribution).toEqual({ 1: 7, 2: 6, 3: 6, 4: 6, 5: 6 })
      expect(filtered.data.reviews.every(review => review.rating === 1)).toBe(true)
      const customer = await register("limited@reviews.test")
      for (let i = 0; i < 5; i++) expect((await api.post(endpoint() + "/me", clean, store(customer.token))).status).toBe(200)
      expect((await api.post(endpoint() + "/me", clean, store(customer.token))).status).toBe(429)
      expect((await api.delete(endpoint() + "/me", { ...store(customer.token), data: { version: 1 } })).status).toBe(200)
    })

    it("allows both actual staff roles, denies unassigned staff, and rejects stale moderation", async () => {
      const container = getContainer()
      const makeStaff = async (email: string) => {
        const { result: [user] } = await createUsersWorkflow(container).run({ input: { users: [{ email }] } })
        const auth = container.resolve(Modules.AUTH)
        const { authIdentity } = await auth.register("emailpass", { body: { email, password } })
        await auth.updateAuthIdentities({ id: authIdentity!.id, app_metadata: { user_id: user.id } })
        return user
      }
      const admin = await makeStaff("admin@reviews.test")
      await createSuperAdminRole({ container })
      await setupCatalogManager({ container, args: [admin.id] } as never)
      const manager = await makeStaff("manager@reviews.test")
      const [role] = await container.resolve(Modules.RBAC).listRbacRoles({ name: "Catalog Manager" })
      await container.resolve(ContainerRegistrationKeys.LINK).create({ [Modules.USER]: { user_id: manager.id }, [Modules.RBAC]: { rbac_role_id: role.id } })
      await makeStaff("nobody@reviews.test")
      const staff = async (email: string) => {
        const response = await api.post("/auth/user/emailpass", { email, password })
        return { headers: { authorization: `Bearer ${response.data.token}` }, validateStatus: () => true }
      }
      const adminSession = await staff("admin@reviews.test")
      const managerSession = await staff("manager@reviews.test")
      const nobody = await staff("nobody@reviews.test")
      const customer = await register("author@reviews.test")
      const pending = await api.post(endpoint() + "/me", { ...clean, content: "Visit www.example.com for my full review." }, store(customer.token))
      const review = pending.data.review
      expect((await api.get("/admin/product-reviews", nobody)).status).toBe(403)
      expect((await api.get("/admin/product-reviews", store(customer.token))).status).not.toBe(200)
      expect((await api.get("/admin/product-reviews", managerSession)).data.reviews).toEqual([expect.objectContaining({ id: review.id, status: "pending" })])
      const moderate = (session, version, status = "approved") => api.post(`/admin/product-reviews/${review.id}`, { version, status, reason: "Reviewed the wording and context" }, session)
      expect((await moderate(managerSession, review.version)).status).toBe(200)
      const changed = await api.post(endpoint() + "/me", { ...clean, content: "Another review with www.example.com changed text.", version: review.version + 1 }, store(customer.token))
      expect(changed.data.review.status).toBe("pending")
      expect((await moderate(adminSession, review.version + 1)).status).toBe(409)
      const decisions = await Promise.all([moderate(adminSession, changed.data.review.version), moderate(managerSession, changed.data.review.version, "rejected")])
      expect(decisions.map(response => response.status).sort()).toEqual([200, 409])
      const current = await reviews().retrieveProductReview(review.id)
      expect([admin.id, manager.id]).toContain(current.moderator_id)
      expect(current.moderation_reason).toBe("Reviewed the wording and context")
      expect((await moderate(adminSession, current.version, "rejected")).status).toBe(200)
      const revised = await api.post(endpoint() + "/me", { ...clean, version: current.version + 1 }, store(customer.token))
      expect(revised.data.review.status).toBe("pending")
      const repeated = await api.post(endpoint() + "/me", { ...clean, version: revised.data.review.version }, store(customer.token))
      expect(repeated.data.review.status).toBe("pending")
      expect((await moderate(managerSession, repeated.data.review.version)).status).toBe(200)
      expect((await api.delete(`/admin/product-reviews/${review.id}`, managerSession)).status).not.toBe(200)
    })
  },
})
