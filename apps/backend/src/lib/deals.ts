import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { EGYPT_STORE } from "./egypt-store"

// A deal is a product with a sale price in an active Price List (Admin →
// Price Lists) that applies to every shopper right now. Promotions are cart
// discounts and are not deals.

// shortcut: at most 100 deal products, raise when the store runs more deals at once.
export const MAX_DEAL_PRODUCTS = 100

export type SalePriceList = {
  starts_at?: string | Date | null
  ends_at?: string | Date | null
  rules_count?: number | null
  prices?: ({ currency_code?: string | null, price_set?: { variant?: { product_id?: string | null } | null } | null } | null)[] | null
}

const time = (value: string | Date | null | undefined) => (value ? new Date(value).getTime() : null)

// Customer-group lists (rules) are not for everyone, so they are left out.
export function isLiveForEveryone(list: SalePriceList, now: Date) {
  const starts = time(list.starts_at)
  const ends = time(list.ends_at)
  return !list.rules_count && (starts === null || starts <= now.getTime()) && (ends === null || ends > now.getTime())
}

export function saleProductIds(lists: SalePriceList[], now: Date) {
  const ids = new Set<string>()
  for (const list of lists.filter((list) => isLiveForEveryone(list, now))) {
    for (const price of list.prices ?? []) {
      const productId = price?.price_set?.variant?.product_id
      if (productId && price?.currency_code === EGYPT_STORE.currencyCode) ids.add(productId)
    }
  }
  return [...ids].slice(0, MAX_DEAL_PRODUCTS)
}

export async function dealProductIds(container: MedusaContainer, now = new Date()) {
  const { data } = await container.resolve(ContainerRegistrationKeys.QUERY).graph({
    entity: "price_list",
    fields: ["starts_at", "ends_at", "rules_count", "prices.currency_code", "prices.price_set.variant.product_id"],
    filters: { status: "active", type: "sale" },
  })
  return saleProductIds(data as SalePriceList[], now)
}
