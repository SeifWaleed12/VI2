"use client";
import { useLanguage } from "@/context/LanguageContext";
import { useLocaleRouter } from "@/hooks/use-locale-router";

import Link from "@/components/LocaleLink";
import {
  ArrowRight,
  CheckCircle2,
  LockKeyhole,
} from "lucide-react";
import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import {
  useSearchParams,
} from "next/navigation";

import { resetPassword } from "@/lib/medusa";

import styles from "../AccountAuth.module.css";

export default function ResetPasswordClient() {
  const { msg, t } = useLanguage();
  const router = useLocaleRouter();
  const searchParams = useSearchParams();
  // Read once: the token is then removed from the address bar so it does not
  // stay in the browser history or get copied with the URL.
  const [token] = useState(() => searchParams.get("token") ?? "");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (window.location.search) window.history.replaceState(null, "", window.location.pathname);
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError(msg("account.yourPasswordMustBeAt"));
      return;
    }
    if (password !== repeatPassword) {
      setError(msg("account.thePasswordsDoNotMatch"));
      return;
    }

    setLoading(true);
    const result = await resetPassword(token, password);
    setLoading(false);

    if (!result.ok) {
      setError(t(result.message));
      return;
    }

    setSuccess(msg("account.yourPasswordHasBeenChanged"));
    window.setTimeout(() => router.replace("/account/sign-in"), 1200);
  }

  return (
    <main className={styles.page}>
      <section className={`${styles.shell} ${styles.shellSingle}`}>
        <div className={styles.formSide}>
          <div className={styles.kicker}>
            <i />{msg("account.vi2Account")}</div>

          <h1 className={styles.heading}>{msg("account.new")}<span>{msg("account.password4")}</span>
          </h1>

          {!token ? (
            <>
              <p className={styles.intro}>{msg("account.thisResetLinkIsIncomplete")}</p>
              <div className={styles.switch}>
                <Link href="/account/forgot-password">{msg("account.requestANewLink")}</Link>
              </div>
            </>
          ) : (
            <form
              className={styles.form}
              onSubmit={submit}
            >
              <label className={styles.field}>
                <span>{msg("account.newPassword")}</span>
                <input
                  type="password"
                  value={password}
                  autoComplete="new-password"
                  placeholder={msg("account.atLeast8Characters")}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError("");
                  }}
                />
              </label>

              <label className={styles.field}>
                <span>{msg("account.confirmPassword")}</span>
                <input
                  type="password"
                  value={repeatPassword}
                  autoComplete="new-password"
                  placeholder={msg("account.repeatPassword")}
                  onChange={(event) => {
                    setRepeatPassword(event.target.value);
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
                disabled={loading || !!success}
              >
                {loading ? msg("account.saving") : msg("account.setNewPassword")}
                {!loading && <ArrowRight size={16} strokeWidth={1.5} />}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
