import { POST as nativeVerify } from "@medusajs/medusa/api/auth/mfa/challenges/[id]/verify/route"
import { sessionBoundResponse } from "../../../../../auth-session-access"

// Retain the first-factor device and credential snapshot; a challenge cannot
// create a fresh session after that device logs out or its password changes.
export const POST = (req: Parameters<typeof nativeVerify>[0], res: Parameters<typeof nativeVerify>[1]) => sessionBoundResponse(req, res, nativeVerify, true)
