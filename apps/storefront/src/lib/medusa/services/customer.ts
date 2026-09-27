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
  try {
    const res = await fetch("/api/auth/me", {
      cache: "no-store",
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!data.ok || !data.customer) return null;

    return mapMedusaCustomer(data.customer);
  } catch {
    return null;
  }
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

    const customer: Customer = data.customer
      ? mapMedusaCustomer(data.customer)
      : {
          id: "",
          email: credentials.email.trim(),
          firstName: "",
          lastName: "",
          hasAccount: true,
        };

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("vi2-auth-change"));
    }

    return { ok: true, customer };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Invalid email or password.";
    return { ok: false, message };
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

    const customer: Customer = data.customer
      ? mapMedusaCustomer(data.customer)
      : {
          id: "",
          email: credentials.email.trim().toLowerCase(),
          firstName: credentials.firstName.trim(),
          lastName: credentials.lastName.trim(),
          phone: credentials.phone?.trim(),
          hasAccount: true,
        };

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("vi2-auth-change"));
    }

    return { ok: true, customer };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "Registration failed. Please try again.";
    return { ok: false, message };
  }
}

/**
 * Logs out the current customer by calling the Next.js auth BFF,
 * which clears the vi2_auth_token HttpOnly cookie.
 */
export async function logoutCustomer(): Promise<void> {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch {
    // Ignore errors — always proceed with client-side cleanup
  } finally {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("vi2-auth-change"));
    }
  }
}
