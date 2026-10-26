export type AdminReview = {
  id: string; product_id: string; first_name: string | null; rating: number; title: string | null;
  content: string; status: string; version: number; flags: { reasons?: string[] } | null;
  created_at: string; moderation_reason: string | null;
}
export type ReviewQueue = { reviews: AdminReview[]; count: number; limit: number; offset: number; products: Record<string, string> }
export class ModerationRequestError extends Error {
  constructor(public status: number) { super("Review request failed") }
}
async function request<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, { credentials: "include", signal: AbortSignal.timeout(10000),
    ...(body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}) })
  if (!response.ok) throw new ModerationRequestError(response.status)
  return response.json()
}
export async function loadReviewQueue(status: string, offset: number): Promise<ReviewQueue> {
  const result = await request<Omit<ReviewQueue, "products">>(`/admin/product-reviews?${new URLSearchParams({ status, offset: String(offset), limit: "10" })}`)
  const products: Record<string, string> = {}
  const ids = [...new Set(result.reviews.map(review => review.product_id))]
  if (ids.length) {
    const params = new URLSearchParams({ fields: "id,title", limit: "20" })
    ids.forEach(id => params.append("id[]", id))
    // Titles are optional context; one bounded native batch, never a lookup per review.
    const data = await request<{ products: { id: string; title: string }[] }>(`/admin/products?${params}`).catch(() => null)
    for (const product of data?.products ?? []) products[product.id] = product.title
  }
  return { ...result, products }
}
export const moderateReview = (id: string, version: number, status: "approved" | "rejected", reason: string) =>
  request<{ review: AdminReview }>(`/admin/product-reviews/${encodeURIComponent(id)}`, { version, status, reason })
