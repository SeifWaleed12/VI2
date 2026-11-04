"use client";

import { useLanguage } from "@/context/LanguageContext";

export default function OrderLoading() {
  const { msg } = useLanguage();
  return (
    <main style={{ minHeight: "70vh", display: "grid", placeItems: "center", background: "#f8f4ed" }}>
      <div style={{ display: "grid", justifyItems: "center", gap: "8px" }}>
        <strong style={{ fontSize: "var(--text-ui)", letterSpacing: "0.12em" }}>VI2</strong>
        <span style={{ fontSize: "var(--text-ui)", fontWeight: 800, letterSpacing: "0.14em" }}>{msg("order.preparing")}</span>
      </div>
    </main>
  );
}
