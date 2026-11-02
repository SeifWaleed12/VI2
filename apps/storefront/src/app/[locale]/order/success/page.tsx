export const metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" as const };
import {
  Suspense,
} from "react";

import OrderLoading from "./OrderLoading";
import SuccessClient from "./SuccessClient";

export default function OrderSuccessPage() {
  return (
    <Suspense
      fallback={
        <OrderLoading />
      }
    >
      <SuccessClient />
    </Suspense>
  );
}
