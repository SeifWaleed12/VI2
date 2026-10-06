import { changePassword } from "../change-password"
import { attemptKey, type AttemptLimiter } from "../login-attempts"

function fakes({ currentPassword = "old-password", allowed = true } = {}) {
  const limiter = { reserve: jest.fn(async () => allowed), clear: jest.fn(async () => undefined) } satisfies AttemptLimiter
  const auth = {
    authenticate: jest.fn(async (_provider: string, data: { body?: Record<string, string> }) =>
      ({ success: data.body?.password === currentPassword })),
    updateProvider: jest.fn(async () => ({ success: true })),
  }
  return { limiter, auth, deps: { limiter, auth: auth as never } }
}

const input = { actorType: "customer" as const, email: "shopper@example.com", currentPassword: "old-password", newPassword: "new-password" }

it("checks the current password, sets the new one and clears the count", async () => {
  const { deps, auth, limiter } = fakes()
  expect(await changePassword(deps, input)).toEqual({ outcome: "changed" })
  expect(auth.authenticate).toHaveBeenCalledWith("emailpass", { body: { email: "shopper@example.com", password: "old-password" } })
  expect(auth.updateProvider).toHaveBeenCalledWith("emailpass", { entity_id: "shopper@example.com", password: "new-password" })
  expect(limiter.clear).toHaveBeenCalledWith(attemptKey("login-attempts", "customer", "shopper@example.com"))
})

it("counts a wrong current password against the sign-in limit and changes nothing", async () => {
  const { deps, auth, limiter } = fakes()
  expect(await changePassword(deps, { ...input, currentPassword: "guess" })).toEqual({ outcome: "wrong_password" })
  expect(limiter.reserve).toHaveBeenCalledWith(attemptKey("login-attempts", "customer", "shopper@example.com"))
  expect(limiter.clear).not.toHaveBeenCalled()
  expect(auth.updateProvider).not.toHaveBeenCalled()
})

it("refuses while the account is locked, even with the right password", async () => {
  const { deps, auth } = fakes({ allowed: false })
  expect(await changePassword(deps, input)).toEqual({ outcome: "locked" })
  expect(auth.authenticate).not.toHaveBeenCalled()
})

it("rejects a short new password without using an attempt", async () => {
  const { deps, limiter, auth } = fakes()
  expect(await changePassword(deps, { ...input, newPassword: "short" })).toEqual({ outcome: "invalid", message: "Password must be at least 8 characters." })
  expect(limiter.reserve).not.toHaveBeenCalled()
  expect(auth.updateProvider).not.toHaveBeenCalled()
})

it("fails loudly if Medusa cannot store the new password", async () => {
  const { deps, auth, limiter } = fakes()
  auth.updateProvider.mockResolvedValue({ success: false })
  await expect(changePassword(deps, input)).rejects.toThrow("could not be changed")
  expect(limiter.clear).not.toHaveBeenCalled()
})
