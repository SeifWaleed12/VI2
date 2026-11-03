"use client";

import { useEffect, type ReactNode } from "react";

function scrollToDestination() {
  if (window.location.hash) {
    try {
      const id = decodeURIComponent(window.location.hash.slice(1));
      document
        .getElementById(id)
        ?.scrollIntoView({ behavior: "instant", block: "start" });
    } catch {
      // An invalid fragment must not break navigation or reset a valid page to the top.
    }
    return;
  }
  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

export default function Template({ children }: { children: ReactNode }) {
  useEffect(() => {
    if ("scrollRestoration" in window.history)
      window.history.scrollRestoration = "manual";
    const frames: number[] = [];
    const timers: number[] = [];

    // Preserve the existing route reset, but respect fragment destinations around paint.
    scrollToDestination();
    frames.push(
      window.requestAnimationFrame(() => {
        scrollToDestination();
        frames.push(window.requestAnimationFrame(scrollToDestination));
      }),
    );

    const handleInternalClick = (event: MouseEvent) => {
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor = (event.target as Element | null)?.closest?.(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (
        !anchor ||
        (anchor.target && anchor.target !== "_self") ||
        anchor.hasAttribute("download")
      )
        return;
      const href = anchor.getAttribute("href");
      if (!href) return;
      let nextUrl: URL;
      try {
        nextUrl = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (nextUrl.origin !== window.location.origin) return;
      const destinationChanged =
        nextUrl.pathname !== window.location.pathname ||
        nextUrl.search !== window.location.search;
      if (!destinationChanged && !nextUrl.hash) return;
      // Also handles a repeated click on the current hash, which emits no hashchange.
      timers.push(window.setTimeout(scrollToDestination, 0));
      if (destinationChanged)
        timers.push(window.setTimeout(scrollToDestination, 80));
    };
    const handlePopState = () => {
      timers.push(window.setTimeout(scrollToDestination, 0));
    };
    document.addEventListener("click", handleInternalClick, true);
    window.addEventListener("hashchange", scrollToDestination);
    window.addEventListener("popstate", handlePopState);
    return () => {
      frames.forEach((frame) => window.cancelAnimationFrame(frame));
      timers.forEach((timer) => window.clearTimeout(timer));
      document.removeEventListener("click", handleInternalClick, true);
      window.removeEventListener("hashchange", scrollToDestination);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);
  return <>{children}</>;
}
