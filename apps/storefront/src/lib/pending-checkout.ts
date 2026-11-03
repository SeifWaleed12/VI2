// What a checkout in progress keeps in this browser tab. Sign-out removes every
// "vi2-pending-checkout:" key (services/customer.ts). Storage can be disabled,
// so every call is best effort.

const CART_KEY = "vi2-pending-checkout:cart";
const DETAILS_KEY = "vi2-pending-checkout:details";

function read(key: string) {
  try { return window.sessionStorage.getItem(key); } catch { return null; }
}
function write(key: string, value: string | null) {
  try {
    if (value === null) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, value);
  } catch { /* storage unavailable */ }
}

// A cart whose completion was sent but not confirmed, so checkout can retry it
// instead of starting a second order.
export const pendingCartId = () => read(CART_KEY);
export const rememberPendingCart = (cartId: string) => write(CART_KEY, cartId);
// Changing the cart means a new checkout: the old completion is not retried.
export const forgetPendingCart = () => write(CART_KEY, null);

// The delivery details typed so far, kept until the order is placed.
export function savedDetails<T extends Record<string, string>>(fields: T): T | null {
  try {
    const parsed: unknown = JSON.parse(read(DETAILS_KEY) ?? "null");
    if (!parsed || typeof parsed !== "object") return null;
    const values = parsed as Record<string, unknown>;
    return Object.fromEntries(Object.keys(fields).map((key) => [key, typeof values[key] === "string" ? values[key] : fields[key]])) as T;
  } catch {
    return null;
  }
}
export const saveDetails = (details: Record<string, string>) => write(DETAILS_KEY, JSON.stringify(details));
export const forgetDetails = () => write(DETAILS_KEY, null);
