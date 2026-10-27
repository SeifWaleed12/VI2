"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";
import { listProducts } from "@/lib/medusa/services/products";

// The most one cart may hold of each variant (ProductVariant.maxQuantity), read
// fresh for the given products, and again on refresh() (after Medusa refused a
// change). A variant missing from the result has no limit we know of; Medusa
// still refuses anything it cannot fulfil.
export function useStockLimits(productIds: string[], locale: Locale) {
  const key = [...new Set(productIds)].sort().join(",");
  const [limits, setLimits] = useState<Record<string, number>>({});
  const [reads, setReads] = useState(0);
  useEffect(() => {
    if (!key) return;
    let active = true;
    // shortcut: the first 24 products only (the fresh route's page size); page through them if carts grow larger.
    void listProducts({ locale, id: key.split(",").slice(0, 24), limit: 24, fresh: true })
      .then(({ products }) => {
        if (!active) return;
        setLimits(Object.fromEntries(products.flatMap((product) => (product.variants ?? [])
          .flatMap((variant) => variant.maxQuantity === undefined ? [] : [[variant.id, variant.maxQuantity]]))));
      })
      // An old limit could be wrong by now; without one the cart behaves as before.
      .catch(() => { if (active) setLimits({}); });
    return () => { active = false; };
  }, [key, locale, reads]);
  return { limits, refresh: () => setReads((count) => count + 1) };
}
