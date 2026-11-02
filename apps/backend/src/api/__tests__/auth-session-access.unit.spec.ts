import type { MedusaResponse } from "@medusajs/framework/http"
import { activeSecuritySession, sessionBoundResponse } from "../auth-session-access"
import { bindSecuritySession, requireSecuritySession } from "../../lib/security-session"

jest.mock("../../lib/security-session", () => ({ bindSecuritySession: jest.fn(), requireSecuritySession: jest.fn() }))
beforeEach(() => jest.clearAllMocks())

it("withholds the native token until its device session is persisted", async () => {
  let finish!: (token: string) => void
  jest.mocked(bindSecuritySession).mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
  const send = jest.fn(), res = { json: send, status: jest.fn().mockReturnThis() }
  const native = jest.fn(async (_req, response) => response.status(200).json({ token: "native-token", verification_required: false }))
  const result = sessionBoundResponse({ scope: {} } as never, res as unknown as MedusaResponse, native)
  await new Promise(resolve => setImmediate(resolve))
  expect(send).not.toHaveBeenCalled()
  finish("bound-token")
  await result
  expect(send).toHaveBeenCalledWith({ token: "bound-token", verification_required: false })
})

it("never sends an unbound token when session persistence fails", async () => {
  jest.mocked(bindSecuritySession).mockRejectedValueOnce(new Error("session store failed"))
  const send = jest.fn(), res = { json: send }
  await expect(sessionBoundResponse({ scope: {} } as never, res as unknown as MedusaResponse, async (_req, response) => response.json({ token: "native-token" }))).rejects.toThrow("session store failed")
  expect(send).not.toHaveBeenCalled()
})

it("passes the existing device context through refresh", async () => {
  jest.mocked(bindSecuritySession).mockResolvedValueOnce("refreshed-token")
  const context = { auth_identity_id: "auth_1", app_metadata: { vi2_session_id: "device_1" } }
  const req = { scope: {}, auth_context: context }, res = { json: jest.fn() }
  await sessionBoundResponse(req as never, res as unknown as MedusaResponse, async (_req, response) => response.json({ token: "native-token" }), true)
  expect(bindSecuritySession).toHaveBeenCalledWith(req.scope, "native-token", context)
})

it("stops authenticated requests when their persistent session is invalid", async () => {
  jest.mocked(requireSecuritySession).mockRejectedValueOnce(new Error("revoked"))
  const next = jest.fn()
  await expect(activeSecuritySession({ scope: {}, auth_context: { auth_identity_id: "auth_1" } } as never, {} as never, next)).rejects.toThrow("revoked")
  expect(next).not.toHaveBeenCalled()
})
