"use client";

import { ChevronDown, UserRound } from "lucide-react";
import { useEffect, useRef } from "react";
import AccountDropdown from "@/components/AccountDropdown";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import styles from "./Navbar.module.css";

type Props = {
  open: boolean;
  setOpen: (open: boolean | ((current: boolean) => boolean)) => void;
  // Opening the account menu closes the category menu.
  onOpening: () => void;
};

// The header's account button with its hover/click dropdown.
export default function NavbarAccount({ open, setOpen, onOpening }: Props) {
  const { msg, isArabic } = useLanguage();
  const { customer, isAuthenticated, isLoading } = useAuth();
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const openedByHover = useRef(false);
  const displayName = customer ? customer.firstName?.trim() || customer.email?.split("@")[0] || "" : "";

  useEffect(() => {
    if (!open) return;
    function dismissOutside(event: PointerEvent) {
      if (event.target instanceof Node && !wrapRef.current?.contains(event.target)) {
        openedByHover.current = false;
        setOpen(false);
      }
    }
    function dismissOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (wrapRef.current?.contains(document.activeElement)) triggerRef.current?.focus({ preventScroll: true });
      openedByHover.current = false;
      setOpen(false);
    }
    document.addEventListener("pointerdown", dismissOutside);
    document.addEventListener("keydown", dismissOnEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissOutside);
      document.removeEventListener("keydown", dismissOnEscape);
    };
  }, [open, setOpen]);

  return (
    <div
      className={styles.accountWrap}
      ref={wrapRef}
      onPointerEnter={(event) => {
        if (event.pointerType !== "mouse" || open) return;
        onOpening();
        openedByHover.current = true;
        setOpen(true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType !== "mouse") return;
        openedByHover.current = false;
        setOpen(false);
      }}
    >
      <button
        type="button"
        className={styles.account}
        ref={triggerRef}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={(event) => {
          onOpening();
          const pinHover = event.detail > 0 && openedByHover.current;
          openedByHover.current = false;
          setOpen((current) => pinHover || !current);
        }}
      >
        <UserRound size={21} strokeWidth={1.4} />
        <div>
          {isAuthenticated ? (
            <strong className={styles.customerName} title={displayName || msg("nav.account")}>
              <bdi>{displayName || msg("nav.account")}</bdi>
            </strong>
          ) : (
            <>
              <span>{msg("navbar.account")}</span>
              {!isLoading && <strong>{msg("navbar.signIn")}</strong>}
            </>
          )}
        </div>
        <ChevronDown className={styles.accountChevron} size={14} strokeWidth={1.5} />
      </button>

      <AccountDropdown open={open} isArabic={isArabic} onClose={() => setOpen(false)} />
    </div>
  );
}
