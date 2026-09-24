"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Heart,
  LockKeyhole,
  PackageCheck,
  ShieldCheck,
  Sparkles,
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

import { useAuth } from "@/context/AuthContext";

import styles from "../AccountAuth.module.css";

export default function SignInClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, isAuthenticated } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const next = searchParams.get("next") || "/account";

  useEffect(() => {
    if (isAuthenticated) {
      router.replace(next);
    }
  }, [isAuthenticated, next, router]);

  async function submit(event: FormEvent) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }

    setLoading(true);

    const result = await signIn({
      email: email.trim(),
      password,
    });

    if (!result.ok) {
      setError(result.message ?? "Invalid email or password.");
      setLoading(false);
      return;
    }

    setSuccess(
      "Signed in. Opening your account...",
    );

    window.setTimeout(
      () => {
        router.replace(
          next,
        );
        router.refresh();
      },
      300,
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <div className={styles.formSide}>
          <div className={styles.kicker}>
            <i />
            VI2 ACCOUNT
          </div>

          <h1 className={styles.heading} data-arabic-text="مرحباً بعودتك.">
            WELCOME
            <span>BACK.</span>
          </h1>

          <p className={styles.intro}>
            Sign in to return to your Vi2 account experience,
            keep your shopping journey organized and make your
            next visit faster.
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
                  setEmail(
                    event.target.value,
                  );
                  setError("");
                }}
              />
            </label>

            <label className={styles.field}>
              <span>PASSWORD</span>

              <div className={styles.passwordWrap}>
                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  autoComplete="current-password"
                  placeholder="Your password"
                  onChange={(event) => {
                    setPassword(
                      event.target.value,
                    );
                    setError("");
                  }}
                />

                <button
                  type="button"
                  className={styles.passwordToggle}
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  onClick={() =>
                    setShowPassword(
                      (current) =>
                        !current,
                    )
                  }
                >
                  {showPassword ? (
                    <EyeOff
                      size={17}
                      strokeWidth={1.4}
                    />
                  ) : (
                    <Eye
                      size={17}
                      strokeWidth={1.4}
                    />
                  )}
                </button>
              </div>
            </label>

            {error && (
              <div className={styles.noticeError}>
                <LockKeyhole
                  size={15}
                  strokeWidth={1.5}
                />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className={styles.noticeSuccess}>
                <CheckCircle2
                  size={15}
                  strokeWidth={1.5}
                />
                <span>{success}</span>
              </div>
            )}

            <button
              type="submit"
              className={styles.submit}
              disabled={loading}
            >
              {loading
                ? "SIGNING IN..."
                : "SIGN IN"}

              {!loading && (
                <ArrowRight
                  size={16}
                  strokeWidth={1.5}
                />
              )}
            </button>
          </form>

          <div className={styles.switch}>
            <span>
              New to Vi2?
            </span>

            <Link href="/account/create-account">
              CREATE ACCOUNT
            </Link>
          </div>
        </div>

        <aside className={styles.trustSide}>
          <div className={styles.sideMark}>
            <strong>VI2</strong>

            <span>
              LIVE WELL,
              <br />
              LIVE FULLY.
            </span>
          </div>

          <h2 data-arabic-text="حساب واحد. تجربة أسهل.">
            ONE ACCOUNT.
            <span>
              LESS FRICTION.
            </span>
          </h2>

          <p className={styles.sideCopy}>
            A cleaner account experience designed around faster
            return visits, saved preferences and a simpler Vi2 journey.
          </p>

          <div className={styles.benefits}>
            <div className={styles.benefit}>
              <PackageCheck
                size={20}
                strokeWidth={1.4}
              />
              <div>
                <strong>
                  ORDER HISTORY
                </strong>
                <span>
                  Keep purchases together.
                </span>
              </div>
            </div>

            <div className={styles.benefit}>
              <Sparkles
                size={20}
                strokeWidth={1.4}
              />
              <div>
                <strong>
                  VI2 REWARDS
                </strong>
                <span>
                  Member benefits ready for later.
                </span>
              </div>
            </div>

            <div className={styles.benefit}>
              <Heart
                size={20}
                strokeWidth={1.4}
              />
              <div>
                <strong>
                  FASTER RETURN
                </strong>
                <span>
                  Get back to your routine quickly.
                </span>
              </div>
            </div>
          </div>

          <div className={styles.secureLine}>
            <ShieldCheck
              size={14}
              strokeWidth={1.4}
            />
            VI2 ACCOUNT EXPERIENCE
          </div>
        </aside>
      </section>
    </main>
  );
}
