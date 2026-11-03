"use client";

import { useEffect, useRef, type PointerEvent } from "react";

// Native scrolling keeps touch swipes and focused product links usable while
// repeating the same visual cycle at a steady 28 pixels per second.
export function useProductRailScroll(paused: boolean, contentKey: string) {
  const ref = useRef<HTMLDivElement>(null);
  const touching = useRef(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => { clearTimeout(resumeTimer.current); }, []);
  useEffect(() => {
    const viewport = ref.current;
    const cycle = viewport?.querySelector<HTMLElement>("[data-scroll-cycle]");
    if (!viewport || !cycle || paused) return;
    let width = cycle.scrollWidth;
    let position = viewport.scrollLeft;
    let written = viewport.scrollLeft;
    let previous: number | undefined;
    let frame: number;
    const resize = new ResizeObserver(() => { width = cycle.scrollWidth; });
    resize.observe(cycle);
    const tick = (now: number) => {
      const elapsed = previous === undefined ? 0 : Math.min(now - previous, 64);
      previous = now;
      if (touching.current || Math.abs(viewport.scrollLeft - written) > 1) position = viewport.scrollLeft;
      if (!touching.current && width > 0) {
        position = (position + elapsed * 28 / 1000) % width;
        viewport.scrollLeft = position;
      }
      written = viewport.scrollLeft;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); resize.disconnect(); };
  }, [paused, contentKey]);

  const resumeAfterInertia = () => {
    clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => { touching.current = false; }, 1500);
  };
  const releaseTouch = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") resumeAfterInertia();
  };
  return {
    ref,
    touchInteractions: {
      onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
        if (event.pointerType !== "touch") return;
        clearTimeout(resumeTimer.current);
        touching.current = true;
      },
      // Native scrolling keeps extending the pause while a swipe is coasting.
      onScroll: () => { if (touching.current) resumeAfterInertia(); },
      onPointerUp: releaseTouch,
      onPointerCancel: releaseTouch,
      onPointerLeave: releaseTouch,
    },
  };
}
