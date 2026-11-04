// The state machine for submitting an order. `recovering` means a completion may
// already have run, so the customer retries it instead of starting a new order.

export type Submission = {
  submitting: boolean;
  recovering: boolean;
  error: string;
};

export type SubmissionEvent =
  | { type: "started" }
  | { type: "finished" }
  | { type: "completion_pending" }
  | { type: "resumed" }
  | { type: "abandoned" }
  | { type: "refused"; error: string; retryable: boolean }
  | { type: "failed"; error: string }
  | { type: "error_cleared" };

export const initialSubmission: Submission = { submitting: false, recovering: false, error: "" };

export function submissionReducer(state: Submission, event: SubmissionEvent): Submission {
  switch (event.type) {
    case "started":
      return { ...state, submitting: true, error: "" };
    case "finished":
      return { ...state, submitting: false };
    case "completion_pending":
    case "resumed":
      return { ...state, recovering: true };
    case "abandoned":
      return { ...state, recovering: false };
    case "refused":
      return { ...state, error: event.error, recovering: event.retryable && state.recovering };
    case "failed":
      return { ...state, error: event.error };
    case "error_cleared":
      return { ...state, error: "" };
  }
}
