"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  LockKeyhole,
} from "lucide-react";
import {
  FormEvent,
  useState,
} from "react";

import { requestPasswordReset } from "@/lib/medusa";

import styles from "../AccountAuth.module.css";

export default function ForgotPasswordClient() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!email.trim()) {
      setError("Enter your email address.");
      return;
    }

    setLoading(true);
    const result = await requestPasswordReset(email);
    setLoading(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setSuccess(result.message ?? "Check your email for a link to reset your password.");
  }

  return (
    <main className={styles.page}>
      <section className={`${styles.shell} ${styles.shellSingle}`}>
        <div className={styles.formSide}>
          <div className={styles.kicker}>
            <i />
            VI2 ACCOUNT
          </div>

          <h1 className={styles.heading}>
            FORGOT
            <span>PASSWORD?</span>
          </h1>

          <p className={styles.intro}>
            Enter the email you use for your Vi2 account and we will
            send you a link to choose a new password. The link
            expires in 15 minutes.
          </p>

          <form
            className={styles.form}
            onSubmit={submit}
          >
            <label className={styles.field}>
              <span>EMAIL ADDRESS</span>

              <input
                type="email"
                value={email}
                autoComplete="email"
                placeholder="you@email.com"
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError("");
                }}
              />
            </label>

            {error && (
              <div className={styles.noticeError}>
                <LockKeyhole size={15} strokeWidth={1.5} />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className={styles.noticeSuccess}>
                <CheckCircle2 size={15} strokeWidth={1.5} />
                <span>{success}</span>
              </div>
            )}

            <button
              type="submit"
              className={styles.submit}
              disabled={loading}
            >
              {loading ? "SENDING..." : "SEND RESET LINK"}
              {!loading && <ArrowRight size={16} strokeWidth={1.5} />}
            </button>
          </form>

          <div className={styles.switch}>
            <span>Remembered it?</span>
            <Link href="/account/sign-in">SIGN IN</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
