import type {
  Metadata,
} from "next";
import {
  Suspense,
} from "react";

import SignInClient from "./SignInClient";

export const metadata: Metadata = {
  title: "Sign In | Vi2",
  description:
    "Sign in to your Vi2 account.",
};

export default function SignInPage() {
  return (
    <Suspense>
      <SignInClient />
    </Suspense>
  );
}
