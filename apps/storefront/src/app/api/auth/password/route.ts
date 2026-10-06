import { NextRequest } from "next/server";
import { AUTH_COOKIE, AUTH_TIMEOUT_MS, BACKEND_URL, PUBLISHABLE_KEY, authError, authJson, backendFailure, checkAuthOrigin, expiredSession, readAuthBody, transportFailure, validText } from "@/lib/auth-request";

const PASSWORD_ERRORS: Record<string, string> = {
  wrong_password: "Your current password is not correct.",
  weak_password: "Choose a new password with at least 8 characters.",
};

// Changes the signed-in customer's password after checking the current one.
export async function POST(request: NextRequest) {
  const originError = checkAuthOrigin(request);
  if (originError) return originError;
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (!token) return expiredSession();
  const body = await readAuthBody(request);
  if (!body || !validText(body.currentPassword, 1024) || !validText(body.newPassword, 1024)) {
    return authError("Enter your current and new password.", 400);
  }
  try {
    const backend = await fetch(`${BACKEND_URL}/store/customers/me/password`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "x-publishable-api-key": PUBLISHABLE_KEY },
      body: JSON.stringify({ current_password: body.currentPassword, new_password: body.newPassword }),
      cache: "no-store", signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
    });
    if (backend.ok) return authJson({ ok: true });
    if (backend.status === 400) {
      const data = await backend.json().catch(() => null);
      return authError(PASSWORD_ERRORS[data?.code] ?? "Check the passwords and try again.", 400);
    }
    return backendFailure(backend.status);
  } catch (error) {
    return transportFailure(error);
  }
}
