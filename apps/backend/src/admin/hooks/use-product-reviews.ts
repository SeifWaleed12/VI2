import { useCallback, useEffect, useRef, useState } from "react"
import { loadReviewQueue, moderateReview, ModerationRequestError, type ReviewQueue } from "../lib/product-reviews"

export function useProductReviews() {
  const [data, setData] = useState<ReviewQueue | null>(null)
  const [query, setQuery] = useState({ status: "pending", offset: 0 })
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)
  const request = useRef(0)
  const load = useCallback(async (status: string, offset: number) => {
    const current = ++request.current
    setLoading(true)
    setError(false)
    setQuery({ status, offset })
    try {
      let result = await loadReviewQueue(status, offset)
      if (request.current !== current) return
      if (offset && offset >= result.count) {
        offset = Math.max(0, Math.ceil(result.count / 10) - 1) * 10
        result = await loadReviewQueue(status, offset)
      }
      if (request.current === current) { setData(result); setQuery({ status, offset }) }
    } catch { if (request.current === current) setError(true) }
    finally { if (request.current === current) setLoading(false) }
  }, [])
  useEffect(() => { void load("pending", 0); return () => { request.current++ } }, [load])
  const decide = async (id: string, version: number, status: "approved" | "rejected", reason: string) => {
    try { await moderateReview(id, version, status, reason) }
    catch (error) {
      return error instanceof ModerationRequestError && error.status === 409
        ? "This review changed. Reload the queue and read the latest version before deciding."
        : "The decision could not be saved. Your reason is kept. Try again."
    }
    await load(query.status, query.offset)
    return null
  }
  return { data, query, loading, error, load, decide }
}
