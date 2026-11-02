import { Suspense } from "react";

import CheckoutClient from "./CheckoutClient";
import CheckoutLoading from "./CheckoutLoading";

export default function CheckoutPage() {
  return (
    <Suspense fallback={<CheckoutLoading />}>
      <CheckoutClient />
    </Suspense>
  );
}
