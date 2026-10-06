import type {
  Metadata,
} from "next";

import ForgotPasswordClient from "./ForgotPasswordClient";

export const metadata: Metadata = {
  title: "Forgot Password | Vi2",
  description:
    "Get a link to reset your Vi2 account password.",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordClient />;
}
