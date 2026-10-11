import type {
  Metadata,
} from "next";

import CreateAccountClient from "./CreateAccountClient";

export const metadata: Metadata = {
  title: "Create Account | Vi2",
  description:
    "Create your Vi2 account.",
};

export default function CreateAccountPage() {
  return (
    <CreateAccountClient />
  );
}
