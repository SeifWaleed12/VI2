"use client";
import { useLanguage } from "@/context/LanguageContext";

import Link from "@/components/LocaleLink";
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
  const { msg, t } = useLanguage();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!email.trim()) {
      setError(msg("account.enterYourEmailAddress"));
      return;
    }

    setLoading(true);
    const result = await requestPasswordReset(email);
    setLoading(false);

    if (!result.ok) {
      setError(t(result.message));
      return;
    }

    setSuccess(result.message ? t(result.message) : msg("account.checkYourEmailForA"));
  }

  return (
    <main className={styles.page}>
      <section className={`${styles.shell} ${styles.shellSingle}`}>
        <div className={styles.formSide}>
          <div className={styles.kicker}>
            <i />{msg("account.vi2Account")}</div>

          <h1 className={styles.heading}>{msg("account.forgot")}<span>{msg("account.password3")}</span>
          </h1>

          <p className={styles.intro}>{msg("account.enterTheEmailYouUse")}</p>

          <form
            className={styles.form}
            onSubmit={submit}
          >
            <label className={styles.field}>
              <span>{msg("account.emailAddress2")}</span>

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
              {loading ? msg("account.sending") : msg("account.sendResetLink")}
              {!loading && <ArrowRight size={16} strokeWidth={1.5} />}
            </button>
          </form>

          <div className={styles.switch}>
            <span>{msg("account.rememberedIt")}</span>
            <Link href="/account/sign-in">{msg("account.signIn2")}</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
