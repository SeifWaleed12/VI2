import { createHash } from "node:crypto"
import type { ICacheService, ILockingModule } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

export type LoginAttemptPolicy = { maxAttempts: number, windowSeconds: number }
export type ActorType = "user" | "customer"

// Five tries, then the account is blocked for fifteen minutes. Counted per
// account, not per address: customer logins all reach Medusa from the
// storefront server, and an address can be forged when no proxy sits in front.
// The cost is that anyone can lock an account for fifteen minutes.
export const LOGIN_POLICY: LoginAttemptPolicy = { maxAttempts: 5, windowSeconds: 15 * 60 }

// Requests for a reset email have their own budget so they cannot be used to
// flood an inbox, and so they never count as wrong passwords.
export const RESET_REQUEST_POLICY: LoginAttemptPolicy = { maxAttempts: 5, windowSeconds: 15 * 60 }

export type AttemptPurpose = "login-attempts" | "reset-requests"

// The key is hashed so the cache never holds email addresses, and so characters
// the cache treats specially ("*" is a wildcard) are harmless.
export function attemptKey(purpose: AttemptPurpose, actorType: ActorType, email: unknown) {
  const account = typeof email === "string" ? email.trim().toLowerCase() : ""
  const digest = createHash("sha256").update(`${actorType}\n${account}`).digest("hex")
  return `${purpose}:${digest}`
}

export type AttemptLimiter = {
  reserve(key: string): Promise<boolean>
  clear(key: string): Promise<void>
}

// Resolves Medusa's cache and locking modules: in memory by default, Redis when
// configured (see redis-config.ts). The limiter itself does not change.
export function attemptLimiterFrom(container: { resolve<T = unknown>(key: string): T }, policy: LoginAttemptPolicy) {
  return createLoginAttemptLimiter({
    cache: container.resolve<ICacheService>(Modules.CACHE),
    locking: container.resolve<ILockingModule>(Modules.LOCKING),
  }, policy)
}

export function createLoginAttemptLimiter(
  { cache, locking }: { cache: ICacheService, locking: ILockingModule },
  policy: LoginAttemptPolicy
): AttemptLimiter {
  return {
    // An attempt is counted before the password is checked. Counting only
    // failures afterwards would let parallel requests all pass the check while
    // the count is still low.
    async reserve(key: string): Promise<boolean> {
      return locking.execute(key, async () => {
        const used = (await cache.get<number>(key)) ?? 0
        if (used >= policy.maxAttempts) return false
        await cache.set(key, used + 1, policy.windowSeconds)
        return true
      }, { timeout: 5 })
    },
    async clear(key: string) {
      await cache.invalidate(key)
    },
  }
}
