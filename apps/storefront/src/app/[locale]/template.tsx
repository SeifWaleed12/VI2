"use client";

import {
  useEffect,
  type ReactNode,
} from "react";

function resetToTop() {
  window.scrollTo({
    top: 0,
    left: 0,
    behavior: "auto",
  });

  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

export default function Template({
  children,
}: {
  children: ReactNode;
}) {
  useEffect(() => {
    if (
      "scrollRestoration" in
      window.history
    ) {
      window.history.scrollRestoration =
        "manual";
    }

    /*
      A root app/template.tsx remounts when the active route changes.
      Running twice around paint makes the reset reliable even when
      the destination page has images/layout shifts.
    */
    resetToTop();

    const firstFrame =
      window.requestAnimationFrame(
        () => {
          resetToTop();

          window.requestAnimationFrame(
            resetToTop,
          );
        },
      );

    /*
      Also handle:
      - query-string links such as /shop?category=...
      - mobile bottom navigation
      - normal internal <a> links
    */
    const handleInternalClick = (
      event: MouseEvent,
    ) => {
      const target =
        event.target as
          | Element
          | null;

      const anchor =
        target?.closest(
          "a[href]",
        ) as HTMLAnchorElement | null;

      if (!anchor) {
        return;
      }

      if (
        anchor.target === "_blank" ||
        anchor.hasAttribute(
          "download",
        )
      ) {
        return;
      }

      const href =
        anchor.getAttribute(
          "href",
        );

      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith(
          "mailto:",
        ) ||
        href.startsWith("tel:")
      ) {
        return;
      }

      let nextUrl: URL;

      try {
        nextUrl = new URL(
          anchor.href,
          window.location.href,
        );
      } catch {
        return;
      }

      if (
        nextUrl.origin !==
        window.location.origin
      ) {
        return;
      }

      const destinationChanged =
        nextUrl.pathname !==
          window.location.pathname ||
        nextUrl.search !==
          window.location.search;

      if (
        !destinationChanged
      ) {
        return;
      }

      window.setTimeout(
        resetToTop,
        0,
      );

      window.setTimeout(
        resetToTop,
        80,
      );
    };

    const handlePopState = () => {
      window.setTimeout(
        resetToTop,
        0,
      );
    };

    document.addEventListener(
      "click",
      handleInternalClick,
      true,
    );

    window.addEventListener(
      "popstate",
      handlePopState,
    );

    return () => {
      window.cancelAnimationFrame(
        firstFrame,
      );

      document.removeEventListener(
        "click",
        handleInternalClick,
        true,
      );

      window.removeEventListener(
        "popstate",
        handlePopState,
      );
    };
  }, []);

  return <>{children}</>;
}
