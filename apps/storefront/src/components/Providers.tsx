"use client";

import type { ReactNode } from "react";

import { LanguageProvider } from "@/context/LanguageContext";
import { CategoryProvider } from "@/providers/category-provider"
import { RegionProvider } from "@/providers/region-provider";
import { CustomerProvider } from "@/providers/customer-provider";
import { CartProvider } from "@/providers/cart-provider";

export default function Providers({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <LanguageProvider>
      <RegionProvider>
        <CustomerProvider>
          <CartProvider><CategoryProvider>{children}</CategoryProvider></CartProvider>
        </CustomerProvider>
      </RegionProvider>
    </LanguageProvider>
  );
}