import { randomBytes } from "node:crypto"

export function configuredSecret(name: string, env: NodeJS.ProcessEnv = process.env): string {
  const value = env[name]?.trim()
  if (env.NODE_ENV === "production" && (!value || value.length < 32 || /supersecret|changeme|change-me|example/i.test(value))) {
    throw new Error(`${name} must be a strong, configured production secret (at least 32 characters).`)
  }
  return value || randomBytes(32).toString("hex")
}
