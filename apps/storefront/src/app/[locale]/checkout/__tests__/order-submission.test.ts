import { detailsProblem, initialForm } from "../checkout-details";
import { orderTotals } from "../checkout-total";
import { initialSubmission, submissionReducer, type Submission } from "../order-submission";

const form = { ...initialForm, name: "Sara Ali", phone: "01012345678", email: "sara@test.dev", governorate: "Cairo", area: "Maadi", address: "1 Street" };

describe("submission state machine", () => {
  const recovering: Submission = { submitting: true, recovering: true, error: "" };

  it("clears an old error when a submission starts", () => {
    expect(submissionReducer({ ...initialSubmission, error: "old" }, { type: "started" })).toEqual({ submitting: true, recovering: false, error: "" });
  });

  it("keeps the retry when the outcome is unknown", () => {
    expect(submissionReducer(recovering, { type: "refused", error: "unknown", retryable: true }).recovering).toBe(true);
  });

  it("drops the retry when nothing was placed", () => {
    expect(submissionReducer(recovering, { type: "refused", error: "refused", retryable: false }))
      .toEqual({ submitting: true, recovering: false, error: "refused" });
  });

  it("never starts a retry from a refusal", () => {
    expect(submissionReducer(initialSubmission, { type: "refused", error: "x", retryable: true }).recovering).toBe(false);
  });

  it("keeps recovery through a failure, so a possible order is not placed twice", () => {
    expect(submissionReducer(recovering, { type: "failed", error: "x" }).recovering).toBe(true);
  });

  it("ends a submission without touching its error", () => {
    expect(submissionReducer({ submitting: true, recovering: false, error: "x" }, { type: "finished" }))
      .toEqual({ submitting: false, recovering: false, error: "x" });
  });
});

describe("detailsProblem", () => {
  it("accepts complete details", () => expect(detailsProblem(form, 1)).toBeNull());
  it("refuses an empty order first", () => expect(detailsProblem(initialForm, 0)).toBe("empty_order"));
  it.each(["name", "phone", "governorate", "area", "address"] as const)("requires %s", (key) => {
    expect(detailsProblem({ ...form, [key]: " " }, 1)).toBe("incomplete");
  });
  it("requires a real email", () => expect(detailsProblem({ ...form, email: "nope" }, 1)).toBe("incomplete"));
  it("refuses a non-Egyptian phone", () => expect(detailsProblem({ ...form, phone: "12345" }, 1)).toBe("bad_phone"));
});

describe("orderTotals", () => {
  const items = [{ product: { price: 100 }, quantity: 2 }, { product: { price: 50 }, quantity: 1 }];

  it("adds up the items while the cart initializes", () => {
    expect(orderTotals(null, items)).toEqual({ subtotal: 250, discountTotal: 0, delivery: 0, total: 250, itemCount: 3 });
  });

  it("trusts Medusa's totals once the cart exists", () => {
    const cart = { itemSubtotal: 240, shippingTotal: 30, discountTotal: 20, total: 250 };
    expect(orderTotals(cart, items)).toEqual({ subtotal: 240, discountTotal: 20, delivery: 30, total: 250, itemCount: 3 });
  });

  it("swaps in the chosen delivery price", () => {
    const cart = { itemSubtotal: 240, shippingTotal: 30, discountTotal: 20, total: 250 };
    expect(orderTotals(cart, items, { amount: 0 }).total).toBe(220);
  });
});
