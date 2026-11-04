"use client";

import { useLanguage } from "@/context/LanguageContext";

export default function CheckoutLoading() {
  const { msg } = useLanguage();
  return (
    <main style={{ minHeight: "70vh", display: "grid", placeItems: "center", background: "#f8f4ed" }}>
      <span style={{ fontSize: "8px", fontWeight: 800, letterSpacing: "0.14em" }}>{msg("checkout.preparing")}</span>
    </main>
  );
}
