export type AccountMethod = "GET" | "POST" | "DELETE";
// What each account path may reach on the backend, and the only body fields
// passed on (the backend validates them again).
// listQuery is added to GET only; Medusa refuses unknown query fields on writes.
export type AccountTarget = { backend: string; methods: AccountMethod[]; signedIn: boolean; fields: string[]; listQuery?: string };

const ADDRESS_FIELDS = ["first_name", "last_name", "phone", "address_1", "address_2", "city", "province", "country_code", "address_name", "is_default_shipping"];

export function accountTarget(path: string[]): AccountTarget | null {
  const [section, id, extra] = path;
  if (extra !== undefined) return null;
  if (!id) {
    switch (section) {
      case "profile": return { backend: "/store/customers/me", methods: ["POST"], signedIn: true, fields: ["first_name", "last_name", "phone"] };
      case "email": return { backend: "/store/customers/me/email", methods: ["POST"], signedIn: true, fields: ["email", "password"] };
      // The confirmation link may be opened signed out or on another device.
      case "email-confirm": return { backend: "/store/email-change/confirm", methods: ["POST"], signedIn: false, fields: ["token"] };
      case "points": return { backend: "/store/customers/me/points", methods: ["GET"], signedIn: true, fields: [] };
      case "addresses": return { backend: "/store/customers/me/addresses", methods: ["GET", "POST"], signedIn: true, fields: ADDRESS_FIELDS, listQuery: "limit=50" };
    }
    return null;
  }
  return section === "addresses" && /^[A-Za-z0-9_]+$/.test(id)
    ? { backend: `/store/customers/me/addresses/${id}`, methods: ["POST", "DELETE"], signedIn: true, fields: ADDRESS_FIELDS }
    : null;
}
