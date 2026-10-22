"use client";

import { useRef, useState } from "react";
import {
  Globe,
  LockKeyhole,
  Mail,
  Pencil,
  Phone,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { accountMessage } from "@/lib/account-copy";
import { message, type Locale } from "@/lib/i18n";
import ChangePasswordSection from "./ChangePasswordSection";
import AccountAddresses from "./AccountAddresses";
import { EmailChangeForm, ProfileForm } from "./AccountForms";
import styles from "./Account.module.css";

type Field = "name" | "email" | "phone" | "password";
export default function AccountInformation({ locale }: { locale: Locale }) {
  const { customer, isAuthenticated } = useAuth();
  const { setLanguage } = useLanguage();
  const [editing, setEditing] = useState<Field | null>(null);
  const triggers = useRef<Partial<Record<Field, HTMLButtonElement | null>>>({});
  const msg = (key: Parameters<typeof accountMessage>[1]) =>
    accountMessage(locale, key);
  if (!customer || !isAuthenticated) return null;
  const name = [customer.firstName, customer.lastName]
    .filter(Boolean)
    .join(" ");
  const rows = [
    {
      field: "name",
      Icon: UserRound,
      value: name || msg("notProvided"),
      action: "editName",
    },
    { field: "email", Icon: Mail, value: customer.email, action: "editEmail" },
    {
      field: "phone",
      Icon: Phone,
      value: customer.phone || msg("notProvided"),
      action: "editPhone",
    },
    {
      field: "password",
      Icon: LockKeyhole,
      value: "••••••••",
      action: "changePassword",
    },
  ] as const;
  function cancel() {
    const field = editing;
    setEditing(null);
    if (field) triggers.current[field]?.focus();
  }
  return (
    <div className={styles.information}>
      <p className={styles.description}>{msg("informationDescription")}</p>
      {rows.map(({ field, Icon, value, action }) => (
        <section className={styles.informationRow} key={field}>
          <div className={styles.rowSummary}>
            <Icon size={22} strokeWidth={1.5} aria-hidden="true" />
            <div>
              <h2>{msg(field)}</h2>
              <p>
                <bdi>{value}</bdi>
              </p>
            </div>
            <button
              type="button"
              ref={(node) => {
                triggers.current[field] = node;
              }}
              className={styles.iconButton}
              aria-label={msg(action)}
              aria-expanded={editing === field}
              aria-controls={"edit-" + field}
              onClick={() => setEditing(editing === field ? null : field)}
            >
              <Pencil size={19} strokeWidth={1.5} aria-hidden="true" />
            </button>
          </div>
          {editing === field && (
            <div className={styles.editor} id={"edit-" + field}>
              {field === "password" ? (
                <ChangePasswordSection locale={locale} />
              ) : field === "email" ? (
                <EmailChangeForm locale={locale} />
              ) : (
                <ProfileForm key={customer.id + field} field={field} locale={locale} />
              )}
              <button
                type="button"
                className={styles.textButton}
                onClick={cancel}
              >
                {msg("cancel")}
              </button>
            </div>
          )}
        </section>
      ))}
      <AccountAddresses locale={locale} />
      <section className={styles.informationRow}>
        <div className={styles.rowSummary}>
          <Globe size={22} strokeWidth={1.5} aria-hidden="true" />
          <div>
            <h2>{msg("language")}</h2>
            <p>{locale === "ar" ? "العربية" : "English"}</p>
          </div>
          <button
            type="button"
            className={styles.outlineButton}
            onClick={() => setLanguage(locale === "ar" ? "en" : "ar")}
            aria-label={message(
              locale,
              locale === "ar" ? "nav.switchEnglish" : "nav.switchArabic",
            )}
          >
            {locale === "ar" ? "ENG" : "AR"}
          </button>
        </div>
      </section>
    </div>
  );
}
