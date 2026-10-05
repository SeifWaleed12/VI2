import type {
  Customer,
  LoginCredentials,
  RegisterCredentials,
} from "@/types/customer";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapMedusaCustomer(c: any): Customer {
  return {
    id: c.id,
    email: c.email,
    firstName: c.first_name || c.firstName || "",
    lastName: c.last_name || c.lastName || "",
    phone: c.phone || undefined,
    hasAccount: c.has_account ?? true,
  };
}

/**
 * Fetches the current authenticated customer via the Next.js auth BFF.
 * The BFF reads the vi2_auth_token HttpOnly cookie and queries Medusa.
 */
export async function getCustomer(): Promise<Customer | null> {
  const res = await fetch("/api/auth/me", { cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error("Account service temporarily unavailable.");
  const data = await res.json();
  if (!data.ok || !data.customer) return null;
  return mapMedusaCustomer(data.customer);
}

/**
 * Logs in a customer via the Next.js auth BFF.
 * The BFF authenticates with Medusa and sets the vi2_auth_token HttpOnly cookie.
 * The JWT is never exposed to client-side JavaScript.
 */
export async function loginCustomer(
  credentials: LoginCredentials,
): Promise<{ ok: true; customer: Customer } | { ok: false; message: string }> {
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      signal: AbortSignal.timeout(15000),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: credentials.email.trim(),
        password: credentials.password,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      return {
        ok: false,
        message: data.message || "Invalid email or password.",
      };
    }

    if (!data.customer?.id || !data.customer?.email) return { ok: false, message: "Unable to load your account. Please try again." };
    const customer = mapMedusaCustomer(data.customer);

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("vi2-auth-change"));
    }

    return { ok: true, customer };
  } catch {
    return { ok: false, message: "Unable to sign in right now. Please try again." };
  }
}

/**
 * Registers a new customer via the Next.js auth BFF.
 * The BFF delegates registration to Medusa's backend endpoint, which creates
 * the identity and customer account, and sets the vi2_auth_token HttpOnly cookie.
 */
export async function registerCustomer(
  credentials: RegisterCredentials,
): Promise<{ ok: true; customer: Customer } | { ok: false; message: string }> {
  try {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      signal: AbortSignal.timeout(15000),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: credentials.email.trim().toLowerCase(),
        password: credentials.password,
        firstName: credentials.firstName.trim(),
        lastName: credentials.lastName.trim(),
        phone: credentials.phone?.trim() || undefined,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      return {
        ok: false,
        message:
          data.message || "Registration failed. Please try again.",
      };
    }

    if (!data.customer?.id || !data.customer?.email) return { ok: false, message: "Unable to confirm registration. Try signing in before registering again." };
    const customer = mapMedusaCustomer(data.customer);

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("vi2-auth-change"));
    }

    return { ok: true, customer };
  } catch {
    return { ok: false, message: "Unable to confirm registration. Try signing in before registering again." };
  }
}

/**
 * Logs out the current customer by calling the Next.js auth BFF,
 * which clears the vi2_auth_token HttpOnly cookie.
 */
export async function logoutCustomer(): Promise<void> {
  try {
    const response = await fetch("/api/auth/logout", { method: "POST", signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error("Logout failed");
  } catch {
    throw new Error("Unable to sign out. Please try again.");
  }
  if (typeof window !== "undefined") {
    try { window.localStorage.removeItem("vi2-last-order"); } catch { /* Storage may be disabled. */ }
    window.dispatchEvent(new Event("vi2-auth-change"));
  }
}
