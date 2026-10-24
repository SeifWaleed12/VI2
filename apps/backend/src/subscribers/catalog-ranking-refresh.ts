import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { InventoryEvents, PricingEvents, ProductEvents } from "@medusajs/framework/utils"
import { refreshCatalog } from "../lib/catalog-ranking-refresh"

export default async function catalogRankingRefresh({ event, container }: SubscriberArgs<{ id?: string | string[], ids?: string[] }>) {
  await refreshCatalog(container, undefined, event)
}

export const config: SubscriberConfig = {
  event: [...new Set([
    
    ProductEvents.PRODUCT_UPDATED, ProductEvents.PRODUCT_DELETED, ProductEvents.PRODUCT_RESTORED,
    ProductEvents.PRODUCT_VARIANT_UPDATED, ProductEvents.PRODUCT_VARIANT_DELETED,
    ProductEvents.PRODUCT_CATEGORY_UPDATED, ProductEvents.PRODUCT_CATEGORY_DELETED,
    ProductEvents.PRODUCT_TAG_UPDATED, ProductEvents.PRODUCT_TAG_DELETED,
    ...Object.values(InventoryEvents).filter(name => !name.endsWith("inventory-item.created")),
    ...Object.values(PricingEvents),
    "catalog-ranking.refresh",
    "region.region.updated", "sales_channel.sales-channel.updated", "sales_channel.sales-channel.deleted",
    "store.store.updated", "LinkProductSalesChannel.detached",
    "LinkSalesChannelStockLocation.attached", "LinkSalesChannelStockLocation.detached",
    "LinkProductVariantInventoryItem.detached",
    "LinkProductVariantPriceSet.detached",
    "product.created", "product.updated", "product.deleted", "product-variant.updated",
    "region.updated", "sales-channel.updated", "sales-channel.deleted", "stock-location.updated",
    "brand.brand.created", "brand.brand.updated", "brand.brand.deleted",
    "translation.translation.created", "translation.translation.updated", "translation.translation.deleted",
    "brand.created", "brand.updated", "brand.deleted", "translation.created", "translation.updated", "translation.deleted",
  ])],
  context: { subscriberId: "catalog-ranking-refresh" },
}
