import { LegacyTranslations } from "@/context/LanguageContext";
import {
  Suspense,
} from "react";

import CheckoutClient from "./CheckoutClient";

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <CheckoutLoading />
      }
    >
      <CheckoutClient />
    </Suspense>
  );
}

function CheckoutLoading() {
  return (
    <LegacyTranslations><main
      style={{
        minHeight:
          "70vh",
        display:
          "grid",
        placeItems:
          "center",
        background:
          "#f8f4ed",
      }}
    >
      <span
        style={{
          fontSize:
            "8px",
          fontWeight:
            800,
          letterSpacing:
            "0.14em",
        }}
      >
        PREPARING CHECKOUT
      </span>
    </main></LegacyTranslations>
  );
}
