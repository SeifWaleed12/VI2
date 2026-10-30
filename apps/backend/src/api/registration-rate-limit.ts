import { isIP } from "node:net"
import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { attemptKey, attemptLimiterFrom } from "../lib/login-attempts"
import { tooManyAttempts } from "./login-rate-limit"

export const REGISTRATION_POLICY = { maxAttempts: 10, windowSeconds: 900 }

export function registrationVisitor(req: Pick<MedusaRequest, "headers" | "socket">, env: NodeJS.ProcessEnv = process.env) {
  const name = env.TRUSTED_PROXY_CLIENT_IP_HEADER
  if (name && !["cf-connecting-ip", "x-real-ip"].includes(name)) throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, "Invalid trusted proxy IP header configuration")
  if (!name && env.NODE_ENV === "production") throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Registration requires trusted visitor IP configuration")
  // Enable a header only when the proxy strips visitor-supplied copies and
  // the origin accepts requests exclusively from that trusted proxy.
  const value = name ? req.headers[name] : req.socket?.remoteAddress
  if (typeof value !== "string" || !isIP(value)) throw new MedusaError(MedusaError.Types.INVALID_DATA, "A valid visitor address is required")
  const ip = value.replace(/^::ffff:/i, "")
  return isIP(ip) === 6 ? new URL(`http://[${ip}]/`).hostname : ip
}

export async function limitRegistrationAttempts(req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) {
  const visitor = registrationVisitor(req)
  const limiter = attemptLimiterFrom(req.scope, REGISTRATION_POLICY)
  if (!await limiter.reserve(attemptKey("registration-attempts", "customer", visitor))) return tooManyAttempts(res, REGISTRATION_POLICY)
  return next()
}
