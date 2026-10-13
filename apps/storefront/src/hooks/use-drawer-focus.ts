"use client";
import { useEffect, type RefObject } from "react";

export function useDrawerFocus(
  ref: RefObject<HTMLElement | null>,
  open: boolean,
  close: () => void,
) {
  useEffect(() => {
    const drawer = ref.current;
    if (!open || !drawer) return;
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const focusable = () =>
      Array.from(
        drawer.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
        ),
      ).filter(
        (element) =>
          !element.closest('[inert], [aria-hidden="true"]') &&
          element.getClientRects().length > 0,
      );
    const focusFirst = () => (focusable()[0] || drawer).focus();
    focusFirst();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab") return;
      const elements = focusable();
      const first = elements[0],
        last = elements[elements.length - 1];
      if (!first) {
        event.preventDefault();
        drawer!.focus();
      } else if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === drawer)
      ) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    function onFocus(event: FocusEvent) {
      if (!drawer!.contains(event.target as Node)) focusFirst();
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("focusin", onFocus);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("focusin", onFocus);
      if (
        previous?.isConnected &&
        !previous.closest('[inert], [aria-hidden="true"]') &&
        !previous.matches(":disabled") &&
        previous.getClientRects().length > 0
      )
        previous.focus();
      else document.querySelector<HTMLElement>("[data-cart-trigger]")?.focus();
    };
  }, [ref, open, close]);
}
