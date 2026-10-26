import { reviewErrorResponse } from "../../../lib/product-review-errors"
import { MedusaError } from "@medusajs/framework/utils"
import { screenReview } from "../screen"
import { moderationInput, reviewInput, reviewListInput } from "../validation"

describe("local review screening", () => {
  it.each([
    "This product did not help me. One star.", "It made me feel sick. I stopped taking it.",
    "المنتج مش كويس ومش هشتريه تاني", "سبب لي ألم في المعدة", "The classic packaging is fine",
  ])("does not suppress criticism or medical words: %s", text => expect(screenReview(text)).toEqual([]))
  it.each(["This is fucking awful", "This is fuc\u200bking awful", "كـسـمـك", "كُسْمَك"]) ("holds exact abuse including normalizable disguises: %s", text => expect(screenReview(text)).toContain("profanity"))
  it("does not match substrings inside innocent words", () => expect(screenReview("Scunthorpe class assignment can be reviewed")).toEqual([]))
  it("holds external links and repeated characters", () => {
    expect(screenReview("Visit https://spam.example/offer")).toContain("external_link")
    expect(screenReview("www.example.com")).toContain("external_link")
    expect(screenReview("a".repeat(20))).toContain("repeated_characters")
  })
})
it("rejects forged identity, fractional ratings, unbounded text and unsupported sorting", () => {
  const input = { rating: 1, content: "This did not work for me at all." }
  expect(reviewInput.safeParse(input).success).toBe(true)
  expect(reviewInput.safeParse({ ...input, customer_id: "someone" }).success).toBe(false)
  expect(reviewInput.safeParse({ ...input, rating: 1.5 }).success).toBe(false)
  expect(reviewInput.safeParse({ ...input, content: "x".repeat(3001) }).success).toBe(false)
  expect(reviewListInput.safeParse({ limit: 21 }).success).toBe(false)
  expect(reviewListInput.safeParse({ sort: "rating;drop" }).success).toBe(false)
  expect(moderationInput.safeParse({ status: "approved", version: 1, reason: "" }).success).toBe(false)
})

it("hides database errors and preserves conflict status at the review boundary", () => {
  const response = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() }
  reviewErrorResponse(new Error("secret database connection string"), response as never)
  expect(response.status).toHaveBeenLastCalledWith(503)
  expect(response.json).toHaveBeenLastCalledWith({ message: "Reviews temporarily unavailable. Try again." })
  reviewErrorResponse(new MedusaError(MedusaError.Types.CONFLICT, "private"), response as never)
  expect(response.status).toHaveBeenLastCalledWith(409)
})
