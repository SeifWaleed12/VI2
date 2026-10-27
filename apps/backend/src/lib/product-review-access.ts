import type { AuthenticatedMedusaRequest, MedusaStoreRequest } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import { PRODUCT_REVIEW_MODULE } from "../modules/product-review"
import type ProductReviewModuleService from "../modules/product-review/service"
import { attemptKey, attemptLimiterFrom } from "./login-attempts"

export const reviewsFrom = (request: MedusaStoreRequest) => request.scope.resolve<ProductReviewModuleService>(PRODUCT_REVIEW_MODULE)
export async function requireReviewProduct(request: MedusaStoreRequest) {
  const channels = request.publishable_key_context?.sales_channel_ids ?? []
  if (!channels.length) throw new MedusaError(MedusaError.Types.NOT_FOUND, "Product not found")
  const query = request.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({ entity: "product", fields: ["id", "sales_channels.id"],
    filters: { id: request.params.id, status: "published" } })
  const product = data[0]
  if (!product || !product.sales_channels?.some(channel => channel && channels.includes(channel.id))) throw new MedusaError(MedusaError.Types.NOT_FOUND, "Product not found")
}
export async function reviewCustomer(request: AuthenticatedMedusaRequest) {
  const id = request.auth_context?.actor_id
  if (!id || request.auth_context.actor_type !== "customer") throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Sign in to review")
  const customer = await request.scope.resolve(Modules.CUSTOMER).retrieveCustomer(id, { select: ["id", "first_name", "has_account"] })
  if (!customer.has_account) throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Sign in to review")
  return customer
}
export async function reserveReviewWrite(request: AuthenticatedMedusaRequest, customerId: string) {
  try {
    return await attemptLimiterFrom(request.scope, { maxAttempts: 5, windowSeconds: 900 }).reserve(attemptKey("review-writes", "customer", customerId))
  } catch {
    return null
  }
}
