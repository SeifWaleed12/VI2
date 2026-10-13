import type {
  Metadata,
} from "next";
import {
  Suspense,
} from "react";

import ResetPasswordClient from "./ResetPasswordClient";

export const metadata: Metadata = {
  title: "Reset Password | Vi2",
  description:
    "Choose a new password for your Vi2 account.",
  // The reset token arrives in this page's address; never pass it on.
  referrer: "no-referrer",
};

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordClient />
    </Suspense>
  );
}
