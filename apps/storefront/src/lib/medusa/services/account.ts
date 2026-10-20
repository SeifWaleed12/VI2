// Account changes through the storefront's /api/account BFF (session cookie;
// backend contract in docs/reviews/account-page-backend.md).

export type AccountResult<T> =
  | ({ ok: true } & T)
  | { ok: false; status: number; code?: string };

export type PointsEntry = { id: string; kind: "earn" | "refund" | "expire"; points: number; order_id: string | null; created_at: string };
export type Points = { balance: number; pending: number; expires_at: string | null; history: PointsEntry[] };

export type SavedAddress = {
  id: string;
  address_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  address_1?: string | null;
  address_2?: string | null;
  city?: string | null;
  country_code?: string | null;
};
export type AddressInput = Omit<SavedAddress, "id">;

async function call<T>(path: string, method: "GET" | "POST" | "DELETE" = "GET", body?: unknown): Promise<AccountResult<T>> {
  try {
    const response = await fetch(`/api/account/${path}`, {
      method,
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
      ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return { ok: false, status: response.status, code: typeof data?.code === "string" ? data.code : undefined };
    return { ...data, ok: true };
  } catch {
    return { ok: false, status: 0 };
  }
}

export const updateProfile = (fields: { first_name?: string; last_name?: string; phone?: string }) =>
  call<object>("profile", "POST", fields);

export const requestEmailChange = (email: string, password: string) =>
  call<object>("email", "POST", { email, password });

export const confirmEmailChange = (token: string) =>
  call<{ email: string }>("email-confirm", "POST", { token });

export const getPoints = () => call<{ points: Points }>("points");

export const listAddresses = () => call<{ addresses: SavedAddress[] }>("addresses");

export const saveAddress = (address: AddressInput, id?: string) =>
  call<object>(id ? `addresses/${encodeURIComponent(id)}` : "addresses", "POST", { ...address, country_code: "eg" });

export const deleteAddress = (id: string) => call<object>(`addresses/${encodeURIComponent(id)}`, "DELETE");
