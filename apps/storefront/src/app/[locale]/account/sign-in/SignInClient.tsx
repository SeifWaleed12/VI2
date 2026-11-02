"use client";
import { useLanguage } from "@/context/LanguageContext";
import { useLocaleRouter } from "@/hooks/use-locale-router";

import Link from "@/components/LocaleLink";
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
  useSearchParams,
} from "next/navigation";

import { useAuth } from "@/context/AuthContext";
import { safeRedirect } from "@/lib/safe-redirect";

import styles from "../AccountAuth.module.css";

export default function SignInClient() {
  const { msg, t } = useLanguage();
  const router = useLocaleRouter();
  const searchParams = useSearchParams();
  const { signIn, isAuthenticated } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const next = safeRedirect(searchParams.get("next"));

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
      setError(msg("account.enterYourEmailAndPassword"));
      return;
    }

    setLoading(true);

    const result = await signIn({
      email: email.trim(),
      password,
    });

    if (!result.ok) {
      setError(result.message ? t(result.message) : msg("account.invalidEmailOrPassword"));
      setLoading(false);
      return;
    }

    setSuccess(
      msg("account.signedInOpeningYourAccount"),
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
            <i />{msg("account.vi2Account")}</div>

          <h1 className={styles.heading}>{msg("account.welcome")}<span>{msg("account.back")}</span>
          </h1>

          <p className={styles.intro}>{msg("account.signInToReturnTo")}</p>

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
                  setEmail(
                    event.target.value,
                  );
                  setError("");
                }}
              />
            </label>

            <label className={styles.field}>
              <span>{msg("account.password2")}</span>

              <div className={styles.passwordWrap}>
                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  autoComplete="current-password"
                  placeholder={msg("account.yourPassword")}
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
                      ? msg("account.hidePassword")
                      : msg("account.showPassword")
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

            <Link
              href="/account/forgot-password"
              className={styles.forgotLink}
            >{msg("account.forgotPassword")}</Link>

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
                ? msg("account.signingIn")
                : msg("account.signIn2")}

              {!loading && (
                <ArrowRight
                  size={16}
                  strokeWidth={1.5}
                />
              )}
            </button>
          </form>

          <div className={styles.switch}>
            <span>{msg("account.newToVi2")}</span>

            <Link href="/account/create-account">{msg("account.createAccount")}</Link>
          </div>
        </div>

        <aside className={styles.trustSide}>
          <div className={styles.sideMark}>
            <strong>VI2</strong>

            <span>{msg("account.liveWell")}<br />{msg("account.liveFully")}</span>
          </div>

          <h2>{msg("account.oneAccount")}<span>{msg("account.lessFriction")}</span>
          </h2>

          <p className={styles.sideCopy}>{msg("account.aCleanerAccountExperienceDesigned")}</p>

          <div className={styles.benefits}>
            <div className={styles.benefit}>
              <PackageCheck
                size={20}
                strokeWidth={1.4}
              />
              <div>
                <strong>{msg("account.orderHistory")}</strong>
                <span>{msg("account.keepPurchasesTogether")}</span>
              </div>
            </div>

            <div className={styles.benefit}>
              <Sparkles
                size={20}
                strokeWidth={1.4}
              />
              <div>
                <strong>{msg("account.vi2Rewards")}</strong>
                <span>{msg("account.memberBenefitsReadyForLater")}</span>
              </div>
            </div>

            <div className={styles.benefit}>
              <Heart
                size={20}
                strokeWidth={1.4}
              />
              <div>
                <strong>{msg("account.fasterReturn")}</strong>
                <span>{msg("account.getBackToYourRoutine")}</span>
              </div>
            </div>
          </div>

          <div className={styles.secureLine}>
            <ShieldCheck
              size={14}
              strokeWidth={1.4}
            />{msg("account.vi2AccountExperience")}</div>
        </aside>
      </section>
    </main>
  );
}
