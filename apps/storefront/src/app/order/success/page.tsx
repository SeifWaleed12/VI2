import {
  Suspense,
} from "react";

import SuccessClient from "./SuccessClient";

export default function OrderSuccessPage() {
  return (
    <Suspense
      fallback={
        <SuccessLoading />
      }
    >
      <SuccessClient />
    </Suspense>
  );
}

function SuccessLoading() {
  return (
    <main
      style={{
        minHeight: "70vh",
        display: "grid",
        placeItems: "center",
        background: "#f8f4ed",
        color: "#181916",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <strong
          style={{
            fontSize: "12px",
            letterSpacing: "0.12em",
          }}
        >
          VI2
        </strong>

        <span
          style={{
            fontSize: "7px",
            fontWeight: 800,
            letterSpacing: "0.14em",
          }}
        >
          PREPARING ORDER CONFIRMATION
        </span>
      </div>
    </main>
  );
}
