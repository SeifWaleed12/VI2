"use client";

import { useState, type FormEvent } from "react";
import { changePassword } from "@/lib/medusa";
import { accountMessage } from "@/lib/account-copy";
import type { Locale } from "@/lib/i18n";
import styles from "./Account.module.css";

export default function ChangePasswordSection({
  locale = "en",
}: {
  locale?: Locale;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<
    | "passwordRequired"
    | "passwordMismatch"
    | "passwordChanged"
    | "passwordFailed"
    | null
  >(null);
  const msg = (key: Parameters<typeof accountMessage>[1]) =>
    accountMessage(locale, key);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    setNotice(null);
    if (!currentPassword || !newPassword) {
      setNotice("passwordRequired");
      return;
    }
    if (newPassword !== repeatPassword) {
      setNotice("passwordMismatch");
      return;
    }
    setLoading(true);
    try {
      const result = await changePassword(currentPassword, newPassword);
      if (!result.ok) {
        setNotice("passwordFailed");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setRepeatPassword("");
      setNotice("passwordChanged");
    } catch {
      setNotice("passwordFailed");
    } finally {
      setLoading(false);
    }
  }
  return (
    <form className={styles.form} onSubmit={submit} aria-busy={loading}>
      <label>
        {msg("currentPassword")}
        <input
          autoFocus
          type={visible ? "text" : "password"}
          autoComplete="current-password"
          value={currentPassword}
          required
          maxLength={1024}
          disabled={loading}
          onChange={(event) => setCurrentPassword(event.target.value)}
        />
      </label>
      <label>
        {msg("newPassword")}
        <input
          type={visible ? "text" : "password"}
          autoComplete="new-password"
          value={newPassword}
          required
          minLength={8}
          maxLength={1024}
          disabled={loading}
          aria-describedby="password-hint"
          onChange={(event) => setNewPassword(event.target.value)}
        />
      </label>
      <p id="password-hint" className={styles.hint}>
        {msg("passwordHint")}
      </p>
      <label>
        {msg("confirmPassword")}
        <input
          type={visible ? "text" : "password"}
          autoComplete="new-password"
          value={repeatPassword}
          required
          maxLength={1024}
          disabled={loading}
          onChange={(event) => setRepeatPassword(event.target.value)}
        />
      </label>
      <label className={styles.checkbox}>
        <input
          type="checkbox"
          checked={visible}
          onChange={(event) => setVisible(event.target.checked)}
        />
        {msg("showPasswords")}
      </label>
      {notice && (
        <p
          role={notice === "passwordChanged" ? "status" : "alert"}
          className={styles.notice}
        >
          {msg(notice)}
        </p>
      )}
      <button type="submit" className={styles.darkButton} disabled={loading}>
        {msg(loading ? "saving" : "changePassword")}
      </button>
    </form>
  );
}
