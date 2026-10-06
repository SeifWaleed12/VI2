// One rule for staff and customers, set by the owner: at least 8 characters.
// The upper bound keeps hashing cost predictable.
export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 128

// Returns the reason a password is rejected, or null when it is accepted.
export function passwordProblem(password: unknown): string | null {
  if (typeof password !== "string") return "Password is required."
  if (password.length < PASSWORD_MIN_LENGTH) return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`
  if (password.length > PASSWORD_MAX_LENGTH) return `Password must be at most ${PASSWORD_MAX_LENGTH} characters.`
  return null
}
