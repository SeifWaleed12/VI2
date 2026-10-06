"use client";

import Link from "next/link";
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
  useRouter,
  useSearchParams,
} from "next/navigation";

import { resetPassword } from "@/lib/medusa";

import styles from "../AccountAuth.module.css";

export default function ResetPasswordClient() {
  const router = useRouter();
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
      setError("Your password must be at least 8 characters.");
      return;
    }
    if (password !== repeatPassword) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);
    const result = await resetPassword(token, password);
    setLoading(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setSuccess("Your password has been changed. Opening sign in...");
    window.setTimeout(() => router.replace("/account/sign-in"), 1200);
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
            NEW
            <span>PASSWORD.</span>
          </h1>

          {!token ? (
            <>
              <p className={styles.intro}>
                This reset link is incomplete. Request a new link and
                open it from your email.
              </p>
              <div className={styles.switch}>
                <Link href="/account/forgot-password">REQUEST A NEW LINK</Link>
              </div>
            </>
          ) : (
            <form
              className={styles.form}
              onSubmit={submit}
            >
              <label className={styles.field}>
                <span>NEW PASSWORD *</span>
                <input
                  type="password"
                  value={password}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError("");
                  }}
                />
              </label>

              <label className={styles.field}>
                <span>CONFIRM PASSWORD *</span>
                <input
                  type="password"
                  value={repeatPassword}
                  autoComplete="new-password"
                  placeholder="Repeat password"
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
                {loading ? "SAVING..." : "SET NEW PASSWORD"}
                {!loading && <ArrowRight size={16} strokeWidth={1.5} />}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
