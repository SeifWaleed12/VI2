"use client";

import Link from "next/link";
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
  useRouter,
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
  const router = useRouter();
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
        "Complete all required fields.",
      );
      return;
    }

    if (
      !validEgyptPhone(
        phone,
      )
    ) {
      setError(
        "Enter a valid Egyptian mobile number.",
      );
      return;
    }

    if (
      password.length < 8
    ) {
      setError(
        "Your password must be at least 8 characters.",
      );
      return;
    }

    if (
      password !==
      confirmPassword
    ) {
      setError(
        "The passwords do not match.",
      );
      return;
    }

    if (!accepted) {
      setError(
        "Accept the account terms to continue.",
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
      setError(
        result.message ??
          "Could not create your account. Please try again.",
      );
      setLoading(false);
      return;
    }

    setSuccess(
      "Your Vi2 account is ready.",
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
            <i />
            JOIN VI2
          </div>

          <h1 className={styles.heading} data-arabic-text="أنشئ حساباً.">
            CREATE
            <span>
              ACCOUNT.
            </span>
          </h1>

          <p className={styles.intro}>
            Create your Vi2 account experience for a faster
            return, saved details and future member features.
          </p>

          <form
            className={styles.form}
            onSubmit={submit}
          >
            <div className={styles.nameRow}>
              <label className={styles.field}>
                <span>
                  FIRST NAME *
                </span>

                <input
                  type="text"
                  value={firstName}
                  autoComplete="given-name"
                  placeholder="First name"
                  onChange={(event) => {
                    setFirstName(
                      event.target.value,
                    );
                    setError("");
                  }}
                />
              </label>

              <label className={styles.field}>
                <span>
                  LAST NAME *
                </span>

                <input
                  type="text"
                  value={lastName}
                  autoComplete="family-name"
                  placeholder="Last name"
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
              <span>
                MOBILE NUMBER *
              </span>

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
              <span>
                EMAIL ADDRESS *
              </span>

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
              <span>
                PASSWORD *
              </span>

              <div className={styles.passwordWrap}>
                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  autoComplete="new-password"
                  placeholder="Create password"
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

            <div className={styles.passwordRules}>
              <span>
                <Check size={11} />
                8+ CHARACTERS
              </span>
              <span>
                <Check size={11} />
                KEEP IT UNIQUE
              </span>
            </div>

            <label className={styles.field}>
              <span>
                CONFIRM PASSWORD *
              </span>

              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={confirmPassword}
                autoComplete="new-password"
                placeholder="Repeat password"
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

              <span>
                I agree to create a Vi2 account experience
                using these details on this browser.
              </span>
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
                ? "CREATING ACCOUNT..."
                : "CREATE ACCOUNT"}

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
              Already have an account?
            </span>

            <Link href="/account/sign-in">
              SIGN IN
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

          <h2 data-arabic-text="انضم إلى روتين Vi2.">
            JOIN THE
            <span>
              VI2 ROUTINE.
            </span>
          </h2>

          <p className={styles.sideCopy}>
            A simple member experience built around your
            routine, without connecting any backend yet.
          </p>

          <div className={styles.benefits}>
            <div className={styles.benefit}>
              <Gift
                size={20}
                strokeWidth={1.4}
              />
              <div>
                <strong>
                  MEMBER BENEFITS
                </strong>
                <span>
                  Ready for rewards later.
                </span>
              </div>
            </div>

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
                  Ready for backend connection later.
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
                  YOUR ROUTINE
                </strong>
                <span>
                  Make repeat shopping simpler.
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
                  VI2 IDENTITY
                </strong>
                <span>
                  One clean account journey.
                </span>
              </div>
            </div>
          </div>

          <div className={styles.secureLine}>
            <ShieldCheck
              size={14}
              strokeWidth={1.4}
            />
            FRONTEND ACCOUNT FLOW
          </div>
        </aside>
      </section>
    </main>
  );
}
