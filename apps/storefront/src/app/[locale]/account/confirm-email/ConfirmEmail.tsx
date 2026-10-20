"use client";

import { useEffect, useState } from "react";
import { MailCheck } from "lucide-react";
import Link from "@/components/LocaleLink";
import { useAuth } from "@/context/AuthContext";
import { accountMessage } from "@/lib/account-copy";
import { ACCOUNT_ROUTES } from "@/lib/account-navigation";
import type { Locale } from "@/lib/i18n";
import { confirmEmailChange } from "@/lib/medusa";
import styles from "../Account.module.css";

type Key = Parameters<typeof accountMessage>[1];
const ERRORS: Record<string, Key> = { invalid_link: "emailLinkInvalid", email_taken: "emailTaken", staff_login: "emailStaff" };

// One request per token: React may run the effect twice in development, and
// the token works only once.
let confirming: { token: string; result: ReturnType<typeof confirmEmailChange> } | null = null;
function confirmOnce(token: string) {
  if (confirming?.token !== token) confirming = { token, result: confirmEmailChange(token) };
  return confirming.result;
}

// Confirms an email change with the link's token, once, then removes the token
// from the address bar and history.
export default function ConfirmEmail({ locale }: { locale: Locale }) {
  const { refreshCustomer } = useAuth();
  const [outcome, setOutcome] = useState<{ key: Key; ok: boolean } | null>(null);
  const msg = (key: Key) => accountMessage(locale, key);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token") || confirming?.token || "";
    window.history.replaceState(null, "", window.location.pathname);
    let active = true;
    (token ? confirmOnce(token) : Promise.resolve({ ok: false as const, status: 400, code: "invalid_link" })).then(async (result) => {
      if (result.ok) await refreshCustomer();
      if (active) setOutcome(result.ok ? { key: "emailConfirmed", ok: true } : { key: (result.code && ERRORS[result.code]) || "emailConfirmFailed", ok: false });
    });
    return () => {
      active = false;
    };
    // Runs once: the token is single-use and has been removed from the address.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.page}>
      <section className={styles.emptyState}>
        <MailCheck size={36} strokeWidth={1.5} aria-hidden="true" />
        <h1>{msg("confirmEmailTitle")}</h1>
        <p role={outcome ? (outcome.ok ? "status" : "alert") : "status"}>{msg(outcome?.key ?? "confirmingEmail")}</p>
        {outcome && (
          <Link className={styles.outlineButton} href={outcome.ok ? ACCOUNT_ROUTES.information : ACCOUNT_ROUTES.dashboard}>
            {msg("backToAccount")}
          </Link>
        )}
      </section>
    </main>
  );
}
