"use client";

import { Tag, X } from "lucide-react";
import { useId, useState, type FormEvent } from "react";

import { useCart } from "@/context/CartContext";
import { useLanguage } from "@/context/LanguageContext";
import type { MessageKey } from "@/lib/i18n";
import type { PromoResult } from "@/lib/medusa/services/cart";

import styles from "./Checkout.module.css";

type Failure = Extract<PromoResult, { ok: false }>["reason"];

export const PROMO_MESSAGES: Record<Failure, MessageKey> = {
  loading: "promo.loading",
  invalid: "promo.invalid",
  not_applicable: "promo.notApplicable",
  not_eligible: "promo.notEligible",
  network: "promo.network",
};

// The promo code field, shared by the desktop summary and the mobile summary.
// `collapsible` starts as a quiet "Add promo code" button until it is needed.
export default function PromoCode({ collapsible = false }: { collapsible?: boolean }) {
  const { cart, loading, promotions, applyPromotion, removePromotion } = useCart();
  const { msg } = useLanguage();
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
      setMessage({ ok: true, text: msg("promo.applied").replace("{code}", entered.toUpperCase()) });
    } else {
      setMessage({ ok: false, text: msg(PROMO_MESSAGES[result.reason]) });
    }
  }

  const applied = promotions.filter((promotion) => promotion.code);

  return (
    <div className={styles.promo} data-no-translate>
      {applied.length > 0 && (
        <ul className={styles.promoChips} aria-label={msg("promo.appliedList")}>
          {applied.map((promotion) => {
            // An attached code that takes nothing off (for example after a reload)
            // never looks applied.
            const active = (cart?.promotionSavings?.[promotion.code.toUpperCase()] ?? 0) > 0;
            return (
            <li key={promotion.code} className={active ? undefined : styles.promoChipIdle}>
              <Tag size={15} strokeWidth={1.6} aria-hidden="true" />
              <strong>{promotion.code}</strong>
              {!active && <span>{msg("promo.inactive")}</span>}
              <button type="button" onClick={() => removePromotion(promotion.code)} aria-label={msg("promo.removeCode").replace("{code}", promotion.code)}>
                <X size={15} strokeWidth={1.6} aria-hidden="true" />
                {msg("promo.remove")}
              </button>
            </li>
            );
          })}
        </ul>
      )}

      {open ? (
        <form className={styles.promoForm} onSubmit={apply} noValidate aria-busy={applying}>
          <label htmlFor={`${id}-code`}>{msg("promo.label")}</label>
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
              {msg(applying ? "promo.applying" : "promo.apply")}
            </button>
          </div>
          {message ? (
            <p id={`${id}-note`} className={message.ok ? styles.promoSuccess : styles.promoError} role={message.ok ? "status" : "alert"}>
              {message.text}
            </p>
          ) : !cartReady ? (
            <p id={`${id}-note`} className={styles.promoNote}>{msg("promo.cartLoading")}</p>
          ) : null}
        </form>
      ) : (
        <button type="button" className={styles.promoToggle} onClick={() => setOpen(true)} aria-expanded="false">
          <Tag size={16} strokeWidth={1.6} aria-hidden="true" />
          {msg("promo.add")}
        </button>
      )}
    </div>
  );
}
