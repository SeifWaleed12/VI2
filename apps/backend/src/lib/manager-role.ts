// What the manager role may do, set by the owner on 2026-10-06. A manager runs
// the shop day to day: orders (including fulfilment, refunds and cancellation),
// the catalog (including prices, publishing and deletion), brands, customers,
// promotions and price lists. Admin only: store settings, staff and roles, API
// keys, regions, tax, shipping and location setup, workflows, and any future
// business page such as revenue reports. Stock comes from Odoo, so managers can
// see inventory but never change it or a variant's stock settings.
//
// This one table drives both the request guard (src/api/admin-access.ts) and
// the role's Medusa permissions (src/scripts/setup-catalog-manager.ts).

export type Access = "full" | "read"
export type ManagerArea = { resource: string, access: Access }

const full = (resource: string): ManagerArea => ({ resource, access: "full" })
const read = (resource: string): ManagerArea => ({ resource, access: "read" })

// Keyed by the first segment after /admin/. Any segment not listed is admin only.
export const MANAGER_AREAS: Readonly<Record<string, ManagerArea>> = {
  // Orders and everything that processes them.
  "orders": full("order"),
  "draft-orders": full("order"),
  "order-edits": full("order_change"),
  "order-changes": full("order_change"),
  "claims": full("order_claim"),
  "exchanges": full("order_exchange"),
  "returns": full("return"),
  "fulfillments": full("fulfillment"),
  "payments": full("payment"),
  "payment-collections": full("payment_collection"),
  // Catalog.
  "products": full("product"),
  "product-variants": full("product_variant"),
  "product-options": full("product_option"),
  "product-categories": full("product_category"),
  "collections": full("product_collection"),
  "product-types": full("product_type"),
  "product-tags": full("product_tag"),
  "brands": full("brand"),
  "uploads": full("file"),
  // Customers and marketing.
  "customers": full("customer"),
  "customer-groups": full("customer_group"),
  "promotions": full("promotion"),
  "campaigns": full("campaign"),
  "price-lists": full("price_list"),
  // Stock levels come from Odoo: visible, never edited here. A reservation
  // holds stock, so creating or releasing one by hand is a stock change too;
  // order workflows still reserve and release stock themselves.
  "inventory-items": read("inventory_item"),
  "reservations": read("reservation_item"),
  // Reference data that order, product and customer pages display.
  "stores": read("store"),
  "regions": read("region"),
  "sales-channels": read("sales_channel"),
  "stock-locations": read("stock_location"),
  "shipping-options": read("shipping_option"),
  "shipping-option-types": read("shipping_option_type"),
  "shipping-profiles": read("shipping_profile"),
  "currencies": read("currency"),
  "return-reasons": read("return_reason"),
  "refund-reasons": read("refund_reason"),
  "fulfillment-providers": read("fulfillment_provider"),
  "price-preferences": read("price_preference"),
  "tax-regions": read("tax_region"),
  "translations": read("translation"),
  "locales": read("store_locale"),
  "notifications": read("notification"),
}

// Permissions Medusa's own routes check inside the areas above, on resources
// that have no area of their own.
const NESTED_GRANTS: Readonly<Record<string, Access>> = {
  product_option_value: "full",
  price: "full",
  customer_address: "full",
  refund: "full",
  capture: "full",
  credit_line: "full",
  inventory_level: "read",
  translation_setting: "read",
}

export type PolicyGrant = { resource: string, operation: "read" | "create" | "update" | "delete" | "*" }

// Full use is granted operation by operation: Medusa deletes "resource:*"
// permissions at startup unless code defines them (see src/policies).
const FULL_OPERATIONS = ["read", "create", "update", "delete"] as const

export function managerPolicyGrants(): PolicyGrant[] {
  const byResource = new Map<string, Access>()
  for (const { resource, access } of Object.values(MANAGER_AREAS)) {
    if (byResource.get(resource) !== "full") byResource.set(resource, access)
  }
  for (const [resource, access] of Object.entries(NESTED_GRANTS)) byResource.set(resource, access)
  const grants: PolicyGrant[] = [...byResource].flatMap(([resource, access]) =>
    access === "full" ? FULL_OPERATIONS.map((operation) => ({ resource, operation })) : [{ resource, operation: "read" as const }])
  // Creating a product creates its (empty) inventory item; stock stays read-only.
  grants.push({ resource: "inventory_item", operation: "create" })
  // Medusa's price-list batch route checks "price:*" (defined in src/policies).
  grants.push({ resource: "price", operation: "*" })
  return grants
}
