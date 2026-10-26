import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Badge, Button, Container, Heading, Input, Label, Text } from "@medusajs/ui"
import { MessageSquare } from "lucide-react"
import { useId, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { useProductReviews } from "../../hooks/use-product-reviews"
import type { AdminReview } from "../../lib/product-reviews"

type RowProps = { review: AdminReview; title?: string; decide: ReturnType<typeof useProductReviews>["decide"] }
const FLAGS: Record<string, string> = { profanity: "Possible abusive language", external_link: "External link", repeated_characters: "Repeated characters" }
function ReviewRow({ review, title, decide }: RowProps) {
  const id = useId()
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inFlight = useRef(false)
  const act = async (status: "approved" | "rejected") => {
    if (inFlight.current) return
    if (!reason.trim()) { setError("Give a reason for the decision."); return }
    inFlight.current = true
    setBusy(true)
    setError(null)
    try { setError(await decide(review.id, review.version, status, reason.trim())) }
    finally { inFlight.current = false; setBusy(false) }
  }
  return <article className="border-b border-ui-border-base py-6 last:border-b-0" aria-labelledby={`${id}-product`} aria-busy={busy}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <Heading level="h2" id={`${id}-product`}><Link to={`/products/${review.product_id}`} className="underline">{title || review.product_id}</Link></Heading>
        <Text className="text-ui-fg-subtle">{review.first_name || "Member"} · {review.rating} / 5 · {new Date(review.created_at).toLocaleDateString()}</Text>
      </div>
      <Badge>{review.status}</Badge>
    </div>
    {review.title && <Text className="mt-4 font-medium" dir="auto">{review.title}</Text>}
    <p className="mt-2 max-w-3xl whitespace-pre-wrap break-words text-base leading-relaxed" dir="auto">{review.content}</p>
    {!!review.flags?.reasons?.length && <Text className="mt-3 text-ui-fg-subtle">Screening: {review.flags.reasons.map(flag => FLAGS[flag] || flag).join(", ")}</Text>}
    {review.moderation_reason && <Text className="mt-2" dir="auto">Last decision: {review.moderation_reason}</Text>}
    {review.status !== "withdrawn" && <div className="mt-4 grid max-w-3xl gap-3">
      <Label htmlFor={`${id}-reason`}>Decision reason (shown to the customer if rejected)</Label>
      <Input id={`${id}-reason`} value={reason} onChange={event => setReason(event.target.value)} maxLength={500} disabled={busy} />
      {error && <Text role="alert">{error}</Text>}
      <div className="flex flex-wrap gap-3">
        <Button variant="primary" disabled={busy} onClick={() => void act("approved")}>{busy ? "Saving…" : "Approve"}</Button>
        <Button variant="secondary" disabled={busy} onClick={() => void act("rejected")}>Reject</Button>
      </div>
    </div>}
  </article>
}
const ProductReviewsPage = () => {
  const queue = useProductReviews()
  const heading = useRef<HTMLDivElement>(null)
  const focusHeading = () => heading.current?.focus()
  const id = useId()
  return <Container className="p-6">
    <div ref={heading} tabIndex={-1}><Heading level="h1">Product reviews</Heading></div>
    <Text className="mt-2 max-w-3xl text-ui-fg-subtle">Reviews that pass local screening publish automatically. Review flagged submissions here, oldest pending first. Judge the content consistently, including low ratings; do not rewrite customer feedback.</Text>
    <div className="my-6 flex flex-wrap items-end justify-between gap-4">
      <div className="grid gap-2"><Label htmlFor={`${id}-status`}>Review status</Label><select id={`${id}-status`} value={queue.query.status} onChange={event => void queue.load(event.target.value, 0)} className="min-h-11 rounded border border-ui-border-base bg-ui-bg-field px-3 text-base">
        <option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="withdrawn">Withdrawn</option>
      </select></div>
      <Button variant="secondary" disabled={queue.loading} onClick={() => void queue.load(queue.query.status, queue.query.offset)}>Reload queue</Button>
    </div>
    {queue.loading ? <Text role="status">Loading reviews…</Text> : queue.error ? <Text role="alert">Reviews could not be loaded. Use Reload queue to try again.</Text> : <>
      <Text role="status">{queue.data?.count ?? 0} reviews</Text>
      {queue.data?.reviews.length ? queue.data.reviews.map(review => <ReviewRow key={`${review.id}:${review.version}`} review={review} title={queue.data?.products[review.product_id]} decide={async (...args) => { const error = await queue.decide(...args); if (!error) focusHeading(); return error }} />) : <Text className="py-10">No {queue.query.status} reviews.</Text>}
      {!!queue.data && queue.data.count > 10 && <nav aria-label="Review pages" className="mt-6 flex flex-wrap items-center justify-center gap-4">
        <Button variant="secondary" disabled={!queue.query.offset} onClick={async () => { await queue.load(queue.query.status, queue.query.offset - 10); focusHeading() }}>Previous</Button>
        <Text>Page {Math.floor(queue.query.offset / 10) + 1} of {Math.ceil(queue.data.count / 10)}</Text>
        <Button variant="secondary" disabled={queue.query.offset + 10 >= queue.data.count} onClick={async () => { await queue.load(queue.query.status, queue.query.offset + 10); focusHeading() }}>Next</Button>
      </nav>}
    </>}
  </Container>
}
export default ProductReviewsPage
export const config = defineRouteConfig({ label: "Product reviews", icon: MessageSquare })
