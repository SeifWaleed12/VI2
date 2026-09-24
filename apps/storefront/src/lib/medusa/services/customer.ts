import { medusa } from "../client";
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
    firstName: c.first_name || "",
    lastName: c.last_name || "",
    phone: c.phone || undefined,
    hasAccount: c.has_account ?? true,
  };
}

export async function getCustomer(): Promise<Customer | null> {
  try {
    const { customer } = await medusa.store.customer.retrieve();
    if (!customer) return null;
    return mapMedusaCustomer(customer);
  } catch {
    return null;
  }
}

export async function loginCustomer(
  credentials: LoginCredentials,
): Promise<{ ok: true; customer: Customer } | { ok: false; message: string }> {
  try {
    // SDK handles session cookie creation with Medusa backend (/auth/session)
    await medusa.auth.login("customer", "emailpass", {
      email: credentials.email.trim(),
      password: credentials.password,
    });

    const currentCustomer = await getCustomer();
    if (!currentCustomer) {
      return {
        ok: false,
        message: "Logged in, but could not retrieve customer details.",
      };
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("vi2-auth-change"));
    }

    return { ok: true, customer: currentCustomer };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Invalid email or password.";
    return { ok: false, message };
  }
}

export async function registerCustomer(
  credentials: RegisterCredentials,
): Promise<{ ok: true; customer: Customer } | { ok: false; message: string }> {
  try {
    // 1. Register identity in Medusa Auth
    await medusa.auth.register("customer", "emailpass", {
      email: credentials.email.trim(),
      password: credentials.password,
    });

    // 2. Create customer record bound to identity
    try {
      await medusa.store.customer.create({
        email: credentials.email.trim(),
        first_name: credentials.firstName.trim(),
        last_name: credentials.lastName.trim(),
        ...(credentials.phone ? { phone: credentials.phone.trim() } : {}),
      });
    } catch (profileErr) {
      console.warn("Customer profile creation note:", profileErr);
    }

    // 3. Establish session cookie
    await medusa.auth.login("customer", "emailpass", {
      email: credentials.email.trim(),
      password: credentials.password,
    });

    const customer = await getCustomer();
    const resolvedCustomer: Customer = customer || {
      id: "",
      email: credentials.email.trim(),
      firstName: credentials.firstName.trim(),
      lastName: credentials.lastName.trim(),
      phone: credentials.phone?.trim(),
      hasAccount: true,
    };

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("vi2-auth-change"));
    }

    return { ok: true, customer: resolvedCustomer };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "Registration failed. Please try again.";
    return { ok: false, message };
  }
}

export async function logoutCustomer(): Promise<void> {
  try {
    // Clear session cookie on Medusa backend
    await medusa.client.fetch("/auth/session", {
      method: "DELETE",
    });
  } catch {
    // Ignore backend errors on signout
  } finally {
    await medusa.client.clearToken();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("vi2-auth-change"));
    }
  }
}
