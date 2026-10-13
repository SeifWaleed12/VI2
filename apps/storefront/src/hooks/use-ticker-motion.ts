"use client";
import { useEffect, useRef, useState, type FocusEvent } from "react";

// Shared lifecycle for the two continuous homepage strips.
export function useTickerMotion(itemCount: number) {
  const ref = useRef<HTMLElement>(null);
  const [repetitions, setRepetitions] = useState(1);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [manualPause, setManualPause] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || !itemCount) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(preference.matches);
    const updateVisibility = () =>
      setPageVisible(document.visibilityState !== "hidden");
    const measure = () => {
      const base = element.querySelector<HTMLElement>("[data-ticker-base]");
      const width = base?.getBoundingClientRect().width || 0;
      if (width > 0)
        setRepetitions(Math.max(1, Math.ceil(element.clientWidth / width) + 1));
    };
    updatePreference();
    updateVisibility();
    measure();
    preference.addEventListener("change", updatePreference);
    document.addEventListener("visibilitychange", updateVisibility);
    const resize = new ResizeObserver(measure);
    resize.observe(element);
    const base = element.querySelector("[data-ticker-base]");
    if (base) resize.observe(base);
    const observer = new IntersectionObserver((entries) =>
      setVisible(entries.some((entry) => entry.isIntersecting)),
    );
    observer.observe(element);
    return () => {
      preference.removeEventListener("change", updatePreference);
      document.removeEventListener("visibilitychange", updateVisibility);
      resize.disconnect();
      observer.disconnect();
    };
  }, [itemCount]);

  return {
    ref,
    repetitions,
    reducedMotion,
    manualPause,
    browsing: reducedMotion || focused,
    paused:
      reducedMotion ||
      !visible ||
      !pageVisible ||
      hovered ||
      focused ||
      manualPause,
    togglePause: () => setManualPause((value) => !value),
    interactions: {
      onMouseEnter: () => setHovered(true),
      onMouseLeave: () => setHovered(false),
      onFocus: () => setFocused(true),
      onBlur: (event: FocusEvent<HTMLElement>) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false);
      },
    },
  };
}
