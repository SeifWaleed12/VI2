"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { accountMessage, type AccountKey } from "@/lib/account-copy";
import { emailChangeErrors, profileErrors, type EmailField, type Errors, type ProfileField } from "@/lib/account-validation";
import type { Locale } from "@/lib/i18n";
import { requestEmailChange, updateProfile } from "@/lib/medusa";
import { normalizeEgyptPhone } from "@/app/[locale]/checkout/checkout-details";
import { AccountField, focusFirstError } from "./AccountField";
import styles from "./Account.module.css";

type Notice = { key: AccountKey; ok: boolean } | null;

function Notice({ notice, locale }: { notice: Notice; locale: Locale }) {
  if (!notice) return null;
  return (
    <p role={notice.ok ? "status" : "alert"} className={notice.ok ? styles.notice : styles.fieldError}>
      {accountMessage(locale, notice.key)}
    </p>
  );
}

const read = <F extends string>(form: HTMLFormElement, fields: readonly F[]) => {
  const data = new FormData(form);
  return Object.fromEntries(fields.map((field) => [field, String(data.get(field) ?? "")])) as Record<F, string>;
};
// A field's error clears as soon as it is changed.
const clearOnInput = <F extends string>(set: (update: (current: Errors<F>) => Errors<F>) => void) =>
  (event: FormEvent<HTMLFormElement>) => {
    const name = (event.target as HTMLInputElement).name as F;
    set((current) => (name in current ? { ...current, [name]: undefined } : current));
  };

// Name or mobile number, saved to the customer's account.
export function ProfileForm({ field, locale }: { field: "name" | "phone"; locale: Locale }) {
  const { customer, refreshCustomer } = useAuth();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [errors, setErrors] = useState<Errors<ProfileField>>({});
  const msg = (key: AccountKey) => accountMessage(locale, key);
  if (!customer) return null;
  const fields: readonly ProfileField[] = field === "name" ? ["first_name", "last_name"] : ["phone"];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const values = read(form, fields);
    const found = profileErrors(values);
    setErrors(found);
    setNotice(null);
    if (Object.keys(found).length) return focusFirstError(form, found, fields);
    setBusy(true);
    const result = await updateProfile(field === "name"
      ? { first_name: values.first_name.trim(), last_name: values.last_name.trim() }
      : { phone: normalizeEgyptPhone(values.phone.trim()) });
    if (result.ok) await refreshCustomer();
    setNotice(result.ok ? { key: field === "name" ? "nameSaved" : "phoneSaved", ok: true } : { key: "saveFailed", ok: false });
    setBusy(false);
  }

  return (
    <form className={styles.form} onSubmit={submit} onInput={clearOnInput(setErrors)} noValidate aria-busy={busy}>
      {field === "name" ? (
        <>
          <AccountField name="first_name" label="firstName" locale={locale} error={errors.first_name}>
            {(props) => <input {...props} autoFocus autoComplete="given-name" required defaultValue={customer.firstName} maxLength={255} disabled={busy} />}
          </AccountField>
          <AccountField name="last_name" label="lastName" locale={locale} optional>
            {(props) => <input {...props} autoComplete="family-name" defaultValue={customer.lastName} maxLength={255} disabled={busy} />}
          </AccountField>
        </>
      ) : (
        <AccountField name="phone" label="phone" locale={locale} error={errors.phone} hint="phoneHint" optional>
          {(props) => <input {...props} autoFocus type="tel" inputMode="tel" autoComplete="tel" dir="ltr" defaultValue={customer.phone || ""} maxLength={32} disabled={busy} />}
        </AccountField>
      )}
      <Notice notice={notice} locale={locale} />
      <button type="submit" className={styles.darkButton} disabled={busy}>
        {msg(busy ? "saving" : "save")}
      </button>
    </form>
  );
}

const EMAIL_ERRORS: Record<string, AccountKey> = {
  wrong_password: "emailWrongPassword",
  same_email: "emailSame",
  invalid_request: "emailInvalid",
};
const EMAIL_FIELDS: readonly EmailField[] = ["email", "password"];

// A new email changes only after the customer opens the link sent to it
// (see the confirm-email page).
export function EmailChangeForm({ locale }: { locale: Locale }) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [errors, setErrors] = useState<Errors<EmailField>>({});
  const msg = (key: AccountKey) => accountMessage(locale, key);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const values = read(form, EMAIL_FIELDS);
    const found = emailChangeErrors(values);
    setErrors(found);
    setNotice(null);
    if (Object.keys(found).length) return focusFirstError(form, found, EMAIL_FIELDS);
    setBusy(true);
    const result = await requestEmailChange(values.email.trim(), values.password);
    setBusy(false);
    if (result.ok) {
      form.reset();
      return setNotice({ key: "emailLinkSent", ok: true });
    }
    // A wrong password belongs to the password field; the rest to the form.
    if (result.code === "wrong_password") {
      setErrors({ password: "emailWrongPassword" });
      return focusFirstError(form, { password: true }, EMAIL_FIELDS);
    }
    if (result.code === "same_email") {
      setErrors({ email: "emailSame" });
      return focusFirstError(form, { email: true }, EMAIL_FIELDS);
    }
    setNotice({ key: (result.code && EMAIL_ERRORS[result.code]) || (result.status === 429 ? "tooManyRequests" : "emailFailed"), ok: false });
  }

  return (
    <form className={styles.form} onSubmit={submit} onInput={clearOnInput(setErrors)} noValidate aria-busy={busy}>
      <AccountField name="email" label="newEmail" locale={locale} error={errors.email}>
        {(props) => <input {...props} autoFocus type="email" autoComplete="email" dir="ltr" required maxLength={254} disabled={busy} />}
      </AccountField>
      <AccountField name="password" label="currentPassword" locale={locale} error={errors.password} hint="emailPasswordHint">
        {(props) => <input {...props} type="password" autoComplete="current-password" required maxLength={1024} disabled={busy} />}
      </AccountField>
      <Notice notice={notice} locale={locale} />
      <button type="submit" className={styles.darkButton} disabled={busy}>
        {msg(busy ? "saving" : "sendEmailLink")}
      </button>
    </form>
  );
}
