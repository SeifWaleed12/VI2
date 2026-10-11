import { Suspense } from "react";

import { getProducts, getCategories } from "@/lib/medusa";
import ShopClient from "./ShopClient";

export default async function ShopPage() {
  const [products, categoriesData] = await Promise.all([
    getProducts(),
    getCategories(),
  ]);

  const categoryNames = categoriesData
    .map((c) => c.name)
    .filter(Boolean) as string[];

  return (
    <Suspense fallback={<ShopLoading />}>
      <ShopClient products={products} initialCategories={categoryNames} />
    </Suspense>
  );
}

function ShopLoading() {
  return (
    <main
      style={{
        minHeight: "70vh",
        display: "grid",
        placeItems: "center",
        background: "#fbfaf7",
      }}
    >
      <span
        style={{
          fontSize: "10px",
          fontWeight: 800,
          letterSpacing: "0.14em",
        }}
      >
        LOADING VI2
      </span>
    </main>
  );
}
