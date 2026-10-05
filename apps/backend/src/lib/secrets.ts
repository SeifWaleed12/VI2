import { randomBytes } from "node:crypto"
import { MedusaError } from "@medusajs/framework/utils"

export function configuredSecret(name: string, env: NodeJS.ProcessEnv = process.env): string {
  const value = env[name]?.trim()
  if (env.NODE_ENV === "production" && (!value || value.length < 32 || /supersecret|changeme|change-me|example/i.test(value))) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, `${name} must be a strong, configured production secret (at least 32 characters).`)
  }
  // Outside production, a missing secret gets a per-process random value so no
  // shared, guessable default exists. Sessions reset on restart in that case.
  return value || randomBytes(32).toString("hex")
}
