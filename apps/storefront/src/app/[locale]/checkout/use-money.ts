"use client";

import { useLanguage } from "@/context/LanguageContext";
import { formatPrice } from "./checkout-total";

export function useMoney() {
  const { msg } = useLanguage();
  const money = (value: number) => `${formatPrice(value)} ${msg("nav.egp")}`;
  return { money, deliveryPrice: (value: number) => (value === 0 ? msg("checkout.free") : money(value)) };
}
