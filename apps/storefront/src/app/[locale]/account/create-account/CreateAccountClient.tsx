"use client";
import { useLanguage } from "@/context/LanguageContext";
import { useLocaleRouter } from "@/hooks/use-locale-router";

import Link from "@/components/LocaleLink";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Gift,
  Heart,
  LockKeyhole,
  PackageCheck,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  FormEvent,
  useState,
} from "react";
import {
} from "next/navigation";

import { useAuth } from "@/context/AuthContext";

import styles from "../AccountAuth.module.css";

function normalizeEgyptPhone(
  value: string,
) {
  return value.replace(
    /[\s\-()]/g,
    "",
  );
}

function validEgyptPhone(
  value: string,
) {
  const phone =
    normalizeEgyptPhone(
      value,
    );

  return (
    /^01[0125]\d{8}$/.test(
      phone,
    ) ||
    /^\+201[0125]\d{8}$/.test(
      phone,
    )
  );
}

export default function CreateAccountClient() {
  const { msg, t } = useLanguage();
  const router = useLocaleRouter();
  const { register } = useAuth();

  const [firstName, setFirstName] =
    useState("");
  const [lastName, setLastName] =
    useState("");
  const [phone, setPhone] =
    useState("");
  const [email, setEmail] =
    useState("");
  const [password, setPassword] =
    useState("");
  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");
  const [
    showPassword,
    setShowPassword,
  ] = useState(false);
  const [accepted, setAccepted] =
    useState(false);
  const [loading, setLoading] =
    useState(false);
  const [error, setError] =
    useState("");
  const [success, setSuccess] =
    useState("");
  // The error came from an email that already has an account: offer the way in.
  const [emailTaken, setEmailTaken] = useState(false);

  async function submit(
    event: FormEvent,
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !phone.trim() ||
      !email.trim() ||
      !password ||
      !confirmPassword
    ) {
      setError(
        msg("account.completeAllRequiredFields"),
      );
      return;
    }

    if (
      !validEgyptPhone(
        phone,
      )
    ) {
      setError(
        msg("account.enterAValidEgyptianMobile"),
      );
      return;
    }

    if (
      password.length < 8
    ) {
      setError(
        msg("account.yourPasswordMustBeAt"),
      );
      return;
    }

    if (
      password !==
      confirmPassword
    ) {
      setError(
        msg("account.thePasswordsDoNotMatch"),
      );
      return;
    }

    if (!accepted) {
      setError(
        msg("account.acceptTheAccountTermsTo"),
      );
      return;
    }

    setLoading(true);

    const result = await register({
      email: email.trim().toLowerCase(),
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: normalizeEgyptPhone(phone),
    });

    if (!result.ok) {
      setEmailTaken(result.emailTaken === true);
      setError(
        (result.message && t(result.message)) ||
        msg("account.couldNotCreateYourAccount"),
      );
      setLoading(false);
      return;
    }

    setSuccess(
      msg("account.yourVi2AccountIsReady"),
    );

    window.setTimeout(
      () => {
        router.replace(
          "/account",
        );
        router.refresh();
      },
      350,
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <div className={styles.formSide}>
          <div className={styles.kicker}>
            <i />{msg("account.joinVi2")}</div>

          <h1 className={styles.heading}>{msg("account.create")}<span>{msg("account.account")}</span>
          </h1>

          <p className={styles.intro}>{msg("account.createYourVi2AccountExperience")}</p>

          <form
            className={styles.form}
            onSubmit={submit}
          >
            <div className={styles.nameRow}>
              <label className={styles.field}>
                <span>{msg("account.firstName")}</span>

                <input
                  type="text"
                  value={firstName}
                  autoComplete="given-name"
                  placeholder={msg("account.firstName2")}
                  onChange={(event) => {
                    setFirstName(
                      event.target.value,
                    );
                    setError("");
                  }}
                />
              </label>

              <label className={styles.field}>
                <span>{msg("account.lastName")}</span>

                <input
                  type="text"
                  value={lastName}
                  autoComplete="family-name"
                  placeholder={msg("account.lastName2")}
                  onChange={(event) => {
                    setLastName(
                      event.target.value,
                    );
                    setError("");
                  }}
                />
              </label>
            </div>

            <label className={styles.field}>
              <span>{msg("account.mobileNumber")}</span>

              <input
                type="tel"
                value={phone}
                inputMode="tel"
                autoComplete="tel"
                placeholder="01012345678"
                onChange={(event) => {
                  setPhone(
                    event.target.value,
                  );
                  setError("");
                }}
              />
            </label>

            <label className={styles.field}>
              <span>{msg("account.emailAddress")}</span>

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
              <span>{msg("account.password")}</span>

              <div className={styles.passwordWrap}>
                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  autoComplete="new-password"
                  placeholder={msg("account.createPassword")}
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

            <div className={styles.passwordRules}>
              <span>
                <Check size={11} />{msg("account.8Characters")}</span>
              <span>
                <Check size={11} />{msg("account.keepItUnique")}</span>
            </div>

            <label className={styles.field}>
              <span>{msg("account.confirmPassword")}</span>

              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={confirmPassword}
                autoComplete="new-password"
                placeholder={msg("account.repeatPassword")}
                onChange={(event) => {
                  setConfirmPassword(
                    event.target.value,
                  );
                  setError("");
                }}
              />
            </label>

            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={accepted}
                onChange={(event) =>
                  setAccepted(
                    event.target.checked,
                  )
                }
              />

              <span>{msg("account.iAgreeToCreateA")}</span>
            </label>

            {error && (
              <div className={styles.noticeError}>
                <LockKeyhole
                  size={15}
                  strokeWidth={1.5}
                />
                <span>
                  {error}
                  {emailTaken && (
                    <span className={styles.noticeLinks}>
                      <Link href="/account/sign-in">{msg("account.signIn")}</Link>
                      <Link href="/account/forgot-password">{msg("account.resetPassword")}</Link>
                    </span>
                  )}
                </span>
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
                ? msg("account.creatingAccount")
                : msg("account.createAccount")}

              {!loading && (
                <ArrowRight
                  size={16}
                  strokeWidth={1.5}
                />
              )}
            </button>
          </form>

          <div className={styles.switch}>
            <span>{msg("account.alreadyHaveAnAccount")}</span>

            <Link href="/account/sign-in">{msg("account.signIn2")}</Link>
          </div>
        </div>

        <aside className={styles.trustSide}>
          <div className={styles.sideMark}>
            <strong>VI2</strong>

            <span>{msg("account.liveWell")}<br />{msg("account.liveFully")}</span>
          </div>

          <h2>{msg("account.joinThe")}<span>{msg("account.vi2Routine")}</span>
          </h2>

          <p className={styles.sideCopy}>{msg("account.aSimpleMemberExperienceBuilt")}</p>

          <div className={styles.benefits}>
            <div className={styles.benefit}>
              <Gift
                size={20}
                strokeWidth={1.4}
              />
              <div>
                <strong>{msg("account.memberBenefits")}</strong>
                <span>{msg("account.readyForRewardsLater")}</span>
              </div>
            </div>

            <div className={styles.benefit}>
              <PackageCheck
                size={20}
                strokeWidth={1.4}
              />
              <div>
                <strong>{msg("account.orderHistory")}</strong>
                <span>{msg("account.readyForBackendConnectionLater")}</span>
              </div>
            </div>

            <div className={styles.benefit}>
              <Heart
                size={20}
                strokeWidth={1.4}
              />
              <div>
                <strong>{msg("account.yourRoutine")}</strong>
                <span>{msg("account.makeRepeatShoppingSimpler")}</span>
              </div>
            </div>

            <div className={styles.benefit}>
              <Sparkles
                size={20}
                strokeWidth={1.4}
              />
              <div>
                <strong>{msg("account.vi2Identity")}</strong>
                <span>{msg("account.oneCleanAccountJourney")}</span>
              </div>
            </div>
          </div>

          <div className={styles.secureLine}>
            <ShieldCheck
              size={14}
              strokeWidth={1.4}
            />{msg("account.frontendAccountFlow")}</div>
        </aside>
      </section>
    </main>
  );
}
