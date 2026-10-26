import type { Context, InferTypeOf } from "@medusajs/framework/types"
import type { EntityManager } from "@medusajs/framework/mikro-orm/postgresql"
import { InjectManager, InjectTransactionManager, MedusaContext, MedusaError, MedusaService } from "@medusajs/framework/utils"
import { ProductReview } from "./models/product-review"
import { screenReview, SCREEN_VERSION } from "./screen"
import type { ReviewInput, ReviewListInput } from "./validation"

export type Review = InferTypeOf<typeof ProductReview>
const conflict = () => new MedusaError(MedusaError.Types.CONFLICT, "Review changed. Reload before trying again.")
const sameContent = (review: Review, input: ReviewInput) => review.rating === input.rating && (review.title ?? "") === (input.title ?? "") && review.content === input.content

class ProductReviewModuleService extends MedusaService({ ProductReview }) {
  async own(productId: string, customerId: string) {
    const [review] = await this.listProductReviews({ product_id: productId, customer_id: customerId }, { take: 1 })
    return review ?? null
  }

  async submit(productId: string, customerId: string, firstName: string | null, input: ReviewInput): Promise<Review> {
    const current = await this.own(productId, customerId)
    // A lost initial response may be retried, but cannot overwrite a different review.
    if (current && input.version === undefined) {
      if (current.status !== "withdrawn" && sameContent(current, input)) return current
      throw conflict()
    }
    if ((!current && input.version !== undefined) || (current && current.version !== input.version)) throw conflict()
    const flags = screenReview(`${firstName ?? ""} ${input.title ?? ""} ${input.content}`)
    const staffReviewRequired = current?.status === "rejected" || current?.flags?.staff_review_required === true
    const values = { rating: input.rating, title: input.title || null, content: input.content, first_name: firstName,
      status: flags.length || staffReviewRequired ? "pending" as const : "approved" as const,
      flags: { reasons: flags, staff_review_required: staffReviewRequired }, screen_version: SCREEN_VERSION, moderator_id: null, moderation_reason: null, moderated_at: null }
    if (current) return this.replaceVersion(current, values)
    try {
      return await this.createProductReviews({ product_id: productId, customer_id: customerId, ...values })
    } catch (error) {
      // Native uniqueness errors may be normalized; reconcile only this customer's persisted row.
      const existing = await this.own(productId, customerId).catch(() => null)
      if (existing) {
        if (sameContent(existing, input) && existing.status !== "withdrawn") return existing
        throw conflict()
      }
      throw error
    }
  }

  async withdraw(productId: string, customerId: string, version: number) {
    const current = await this.own(productId, customerId)
    if (!current || current.version !== version) throw conflict()
    if (current.status === "withdrawn") return current
    return this.replaceVersion(current, { status: "withdrawn" })
  }

  async moderate(id: string, version: number, status: "approved" | "rejected", moderatorId: string, reason: string) {
    const current = await this.retrieveProductReview(id)
    if (current.version !== version || current.status === "withdrawn") throw conflict()
    return this.replaceVersion(current, { status, flags: { ...current.flags, staff_review_required: status === "rejected" }, moderator_id: moderatorId, moderation_reason: reason, moderated_at: new Date() })
  }

  @InjectTransactionManager()
  protected async replaceVersion(current: Review, values: Partial<Review>, @MedusaContext() context: Context<EntityManager> = {}): Promise<Review> {
    const manager = context.transactionManager ?? context.manager!
    const knex = manager.getTransactionContext() ?? manager.getKnex()
    // Compare-and-swap in the module persistence boundary, never a read-then-unconditional write.
    const [updated] = await knex("product_review").where({ id: current.id, version: current.version }).whereNull("deleted_at")
      .update({ ...values, flags: values.flags === undefined ? undefined : JSON.stringify(values.flags), version: current.version + 1, updated_at: new Date() }).returning("*")
    if (!updated) throw conflict()
    return updated as Review
  }

  @InjectManager()
  async publicPage(productId: string, input: ReviewListInput, @MedusaContext() context: Context<EntityManager> = {}) {
    const filters = { product_id: productId, status: "approved" as const, ...(input.rating ? { rating: input.rating } : {}) }
    const order: Record<string, "ASC" | "DESC"> = input.sort === "newest" ? { created_at: "DESC" as const, id: "ASC" as const }
      : { rating: input.sort === "highest" ? "DESC" as const : "ASC" as const, created_at: "DESC" as const, id: "ASC" as const }
    const [reviews, count] = await this.listAndCountProductReviews(filters, { take: input.limit, skip: input.offset, order })
    const manager = context.transactionManager ?? context.manager!
    const knex = manager.getTransactionContext() ?? manager.getKnex()
    const buckets = await knex("product_review").select("rating").count({ count: "*" }).where({ product_id: productId, status: "approved" }).whereNull("deleted_at").groupBy("rating")
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    let total = 0
    let sum = 0
    for (const bucket of buckets) {
      const n = Number(bucket.count)
      distribution[bucket.rating] = n
      total += n
      sum += Number(bucket.rating) * n
    }
    return { reviews: reviews.map(publicReview), count, offset: input.offset, limit: input.limit,
      summary: { count: total, average: total ? sum / total : null, distribution } }
  }
}

export function publicReview(review: Review) {
  return { id: review.id, first_name: review.first_name, rating: review.rating, title: review.title, content: review.content, created_at: review.created_at, updated_at: review.updated_at }
}
export function ownReview(review: Review | null) {
  if (!review) return null
  return { ...publicReview(review), status: review.status, version: review.version,
    moderation_reason: review.status === "rejected" ? review.moderation_reason : null }
}
export default ProductReviewModuleService
