"use client";

import type { ReactNode } from "react";

import { LanguageProvider } from "@/context/LanguageContext";
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
          <CartProvider>{children}</CartProvider>
        </CustomerProvider>
      </RegionProvider>
    </LanguageProvider>
  );
}