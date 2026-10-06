import { passwordProblem } from "../password-policy"

it.each([
  ["admin", "at least 8"],
  ["seven77", "at least 8"],
  ["a".repeat(129), "at most 128"],
])("rejects %s", (password, reason) => {
  expect(passwordProblem(password)).toContain(reason)
})

it.each([undefined, null, 12345678, ["long-enough"]])("rejects a non-string password: %p", (password) => {
  expect(passwordProblem(password)).toBe("Password is required.")
})

it.each(["eight888", "correct horse battery staple", "a".repeat(128)])("accepts %s", (password) => {
  expect(passwordProblem(password)).toBeNull()
})
