"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { accountMessage } from "@/lib/account-copy";
import type { Locale } from "@/lib/i18n";
import { requestEmailChange, updateProfile } from "@/lib/medusa";
import { isValidEgyptPhone, normalizeEgyptPhone } from "@/app/[locale]/checkout/checkout-details";
import styles from "./Account.module.css";

type Key = Parameters<typeof accountMessage>[1];
type Notice = { key: Key; ok: boolean } | null;

function Notice({ notice, locale }: { notice: Notice; locale: Locale }) {
  if (!notice) return null;
  return (
    <p role={notice.ok ? "status" : "alert"} className={styles.notice}>
      {accountMessage(locale, notice.key)}
    </p>
  );
}

const text = (data: FormData, name: string) => String(data.get(name) ?? "").trim();

// Name or mobile number, saved to the customer's account.
export function ProfileForm({ field, locale }: { field: "name" | "phone"; locale: Locale }) {
  const { customer, refreshCustomer } = useAuth();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const msg = (key: Key) => accountMessage(locale, key);
  if (!customer) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    const phone = normalizeEgyptPhone(text(data, "phone"));
    if (field === "phone" && phone && !isValidEgyptPhone(phone)) return setNotice({ key: "invalidPhone", ok: false });
    setBusy(true);
    setNotice(null);
    const result = await updateProfile(field === "name" ? { first_name: text(data, "first_name"), last_name: text(data, "last_name") } : { phone });
    if (result.ok) await refreshCustomer();
    setNotice(result.ok ? { key: field === "name" ? "nameSaved" : "phoneSaved", ok: true } : { key: "saveFailed", ok: false });
    setBusy(false);
  }

  return (
    <form className={styles.form} onSubmit={submit} aria-busy={busy}>
      {field === "name" ? (
        <>
          <label>
            {msg("firstName")}
            <input name="first_name" autoFocus autoComplete="given-name" defaultValue={customer.firstName} maxLength={255} disabled={busy} />
          </label>
          <label>
            {msg("lastName")}
            <input name="last_name" autoComplete="family-name" defaultValue={customer.lastName} maxLength={255} disabled={busy} />
          </label>
        </>
      ) : (
        <label>
          {msg("phone")}
          <input name="phone" autoFocus type="tel" autoComplete="tel" dir="ltr" defaultValue={customer.phone || ""} maxLength={32} disabled={busy} />
        </label>
      )}
      <Notice notice={notice} locale={locale} />
      <button type="submit" className={styles.darkButton} disabled={busy}>
        {msg(busy ? "saving" : "save")}
      </button>
    </form>
  );
}

const EMAIL_ERRORS: Record<string, Key> = {
  wrong_password: "emailWrongPassword",
  same_email: "emailSame",
  invalid_request: "emailInvalid",
};

// A new email changes only after the customer opens the link sent to it
// (see the confirm-email page).
export function EmailChangeForm({ locale }: { locale: Locale }) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const msg = (key: Key) => accountMessage(locale, key);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setNotice(null);
    const result = await requestEmailChange(text(data, "email"), String(data.get("password") ?? ""));
    if (result.ok) {
      form.reset();
      setNotice({ key: "emailLinkSent", ok: true });
    } else {
      setNotice({ key: (result.code && EMAIL_ERRORS[result.code]) || (result.status === 429 ? "tooManyRequests" : "emailFailed"), ok: false });
    }
    setBusy(false);
  }

  return (
    <form className={styles.form} onSubmit={submit} aria-busy={busy}>
      <label>
        {msg("newEmail")}
        <input name="email" autoFocus type="email" autoComplete="email" dir="ltr" required maxLength={254} disabled={busy} />
      </label>
      <label>
        {msg("currentPassword")}
        <input name="password" type="password" autoComplete="current-password" required maxLength={1024} disabled={busy} aria-describedby="email-password-hint" />
      </label>
      <p id="email-password-hint" className={styles.hint}>{msg("emailPasswordHint")}</p>
      <Notice notice={notice} locale={locale} />
      <button type="submit" className={styles.darkButton} disabled={busy}>
        {msg(busy ? "saving" : "sendEmailLink")}
      </button>
    </form>
  );
}
