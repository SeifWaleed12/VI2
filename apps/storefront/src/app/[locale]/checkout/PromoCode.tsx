"use client";

import { Tag, X } from "lucide-react";
import { useId, useState, type FormEvent } from "react";

import { useCart } from "@/context/CartContext";
import type { PromoResult } from "@/lib/medusa/services/cart";

import styles from "./Checkout.module.css";

type Failure = Extract<PromoResult, { ok: false }>["reason"];

export const PROMO_MESSAGES: Record<Failure, string> = {
  loading: "Your cart is still loading. Try again in a moment.",
  invalid: "This code isn't valid or has expired.",
  not_applicable: "This code doesn't apply to the items in your cart.",
  network: "We couldn't check this code. Try again.",
};

// The promo code field, shared by the desktop summary and the mobile summary.
// `collapsible` starts as a quiet "Add promo code" button until it is needed.
export default function PromoCode({ collapsible = false }: { collapsible?: boolean }) {
  const { cart, loading, promotions, applyPromotion, removePromotion } = useCart();
  const id = useId();
  const [code, setCode] = useState("");
  const [open, setOpen] = useState(!collapsible);
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const cartReady = Boolean(cart) && !loading;

  async function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const entered = code.trim();
    if (!entered || applying || !cartReady) return;
    setApplying(true);
    setMessage(null);
    const result = await applyPromotion(entered);
    setApplying(false);
    if (result.ok) {
      setCode("");
      setMessage({ ok: true, text: `${entered.toUpperCase()} applied.` });
    } else {
      setMessage({ ok: false, text: PROMO_MESSAGES[result.reason] });
    }
  }

  const applied = promotions.filter((promotion) => promotion.code);

  return (
    <div className={styles.promo}>
      {applied.length > 0 && (
        <ul className={styles.promoChips} aria-label="Applied promo codes">
          {applied.map((promotion) => (
            <li key={promotion.code}>
              <Tag size={15} strokeWidth={1.6} aria-hidden="true" />
              <strong>{promotion.code}</strong>
              <button type="button" onClick={() => removePromotion(promotion.code)} aria-label={`Remove ${promotion.code}`}>
                <X size={15} strokeWidth={1.6} aria-hidden="true" />
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {open ? (
        <form className={styles.promoForm} onSubmit={apply} noValidate aria-busy={applying}>
          <label htmlFor={`${id}-code`}>Promo code</label>
          <div className={styles.promoRow}>
            <input
              id={`${id}-code`}
              value={code}
              onChange={(event) => {
                setCode(event.target.value.toUpperCase());
                if (message && !message.ok) setMessage(null);
              }}
              disabled={applying}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={64}
              aria-invalid={message && !message.ok ? true : undefined}
              aria-describedby={message || !cartReady ? `${id}-note` : undefined}
            />
            <button type="submit" disabled={applying || !cartReady || !code.trim()}>
              {applying ? "Applying…" : "Apply"}
            </button>
          </div>
          {message ? (
            <p id={`${id}-note`} className={message.ok ? styles.promoSuccess : styles.promoError} role={message.ok ? "status" : "alert"}>
              {message.text}
            </p>
          ) : !cartReady ? (
            <p id={`${id}-note`} className={styles.promoNote}>Loading your cart…</p>
          ) : null}
        </form>
      ) : (
        <button type="button" className={styles.promoToggle} onClick={() => setOpen(true)} aria-expanded="false">
          <Tag size={16} strokeWidth={1.6} aria-hidden="true" />
          Add promo code
        </button>
      )}
    </div>
  );
}
