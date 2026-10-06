"use client";

import {
  CheckCircle2,
  LockKeyhole,
} from "lucide-react";
import {
  FormEvent,
  useState,
} from "react";

import { changePassword } from "@/lib/medusa";

import authStyles from "./AccountAuth.module.css";
import styles from "./Account.module.css";

// The server checks the current password and the 8-character rule; this form
// only checks that the new password was typed the same twice.
export default function ChangePasswordSection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!currentPassword || !newPassword) {
      setError("Enter your current and new password.");
      return;
    }
    if (newPassword !== repeatPassword) {
      setError("The new passwords do not match.");
      return;
    }

    setLoading(true);
    const result = await changePassword(currentPassword, newPassword);
    setLoading(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setRepeatPassword("");
    setSuccess("Your password has been changed.");
  }

  return (
    <section className={styles.reorder}>
      <div className={styles.sectionHeading}>
        <div>
          <span>SECURITY</span>
          <h2>CHANGE PASSWORD</h2>
        </div>
      </div>

      <form
        className={authStyles.form}
        style={{ maxWidth: "28rem" }}
        onSubmit={submit}
      >
        <label className={authStyles.field}>
          <span>CURRENT PASSWORD</span>
          <input
            type="password"
            value={currentPassword}
            autoComplete="current-password"
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </label>

        <label className={authStyles.field}>
          <span>NEW PASSWORD (8+ CHARACTERS)</span>
          <input
            type="password"
            value={newPassword}
            autoComplete="new-password"
            onChange={(event) => setNewPassword(event.target.value)}
          />
        </label>

        <label className={authStyles.field}>
          <span>CONFIRM NEW PASSWORD</span>
          <input
            type="password"
            value={repeatPassword}
            autoComplete="new-password"
            onChange={(event) => setRepeatPassword(event.target.value)}
          />
        </label>

        {error && (
          <div className={authStyles.noticeError}>
            <LockKeyhole size={15} strokeWidth={1.5} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className={authStyles.noticeSuccess}>
            <CheckCircle2 size={15} strokeWidth={1.5} />
            <span>{success}</span>
          </div>
        )}

        <button
          type="submit"
          className={authStyles.submit}
          disabled={loading}
        >
          {loading ? "SAVING..." : "CHANGE PASSWORD"}
        </button>
      </form>
    </section>
  );
}
