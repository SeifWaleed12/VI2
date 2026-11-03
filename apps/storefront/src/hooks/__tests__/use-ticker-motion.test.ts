import { useTickerMotion } from "../use-ticker-motion";
import { useEffect } from "react";
let mockValues: unknown[] = [],
  mockCursor = 0;
const listeners = new Map<string, () => void>();
let intersection: (entries: { isIntersecting: boolean }[]) => void;
const preference = {
  matches: false,
  addEventListener: jest.fn((_: string, cb: () => void) =>
    listeners.set("preference", cb),
  ),
  removeEventListener: jest.fn(),
};
const base = { getBoundingClientRect: () => ({ width: 200 }) };
const element = { clientWidth: 900, querySelector: () => base };
jest.mock("react", () => ({
  useRef: () => {
    mockCursor = 0;
    return { current: element };
  },
  useEffect: jest.fn(),
  useState: (initial: unknown) => {
    const index = mockCursor++;
    if (index >= mockValues.length) mockValues.push(initial);
    return [
      mockValues[index],
      (next: unknown) => {
        mockValues[index] =
          typeof next === "function" ? next(mockValues[index]) : next;
      },
    ];
  },
}));
const disconnect = jest.fn();
const oldDocument = globalThis.document,
  oldWindow = globalThis.window;
const oldResize = globalThis.ResizeObserver,
  oldIntersection = globalThis.IntersectionObserver;
function useMotionHarness() {
  return useTickerMotion(2);
}
beforeEach(() => {
  mockValues = [];
  mockCursor = 0;
  listeners.clear();
  jest.clearAllMocks();
  preference.matches = false;
  Object.assign(globalThis, {
    window: { matchMedia: () => preference },
    document: {
      visibilityState: "visible",
      addEventListener: (name: string, cb: () => void) =>
        listeners.set(name, cb),
      removeEventListener: (name: string) => listeners.delete(name),
    },
    ResizeObserver: class {
      observe() {}
      disconnect = disconnect;
    },
    IntersectionObserver: class {
      constructor(cb: typeof intersection) {
        intersection = cb;
      }
      observe() {}
      disconnect = disconnect;
    },
  });
});
afterEach(() =>
  Object.assign(globalThis, {
    document: oldDocument,
    window: oldWindow,
    ResizeObserver: oldResize,
    IntersectionObserver: oldIntersection,
  }),
);
it("fills a short catalog and stops for offscreen, hidden, hover, focus, manual pause and reduced motion", () => {
  let motion = useMotionHarness();
  expect(motion.paused).toBe(true);
  const cleanup = jest.mocked(useEffect).mock.calls[0][0]();
  intersection([{ isIntersecting: true }]);
  motion = useMotionHarness();
  expect(motion.paused).toBe(false);
  expect(motion.repetitions).toBe(6);
  motion.interactions.onMouseEnter();
  expect(useMotionHarness().paused).toBe(true);
  motion.interactions.onMouseLeave();
  expect(useMotionHarness().paused).toBe(false);
  motion.interactions.onFocus();
  expect(useMotionHarness().browsing).toBe(true);
  motion.interactions.onBlur({
    currentTarget: { contains: () => false },
    relatedTarget: null,
  } as never);
  expect(useMotionHarness().browsing).toBe(false);
  motion.togglePause();
  expect(useMotionHarness().paused).toBe(true);
  motion.togglePause();
  expect(useMotionHarness().paused).toBe(false);
  Object.assign(document, { visibilityState: "hidden" });
  listeners.get("visibilitychange")!();
  expect(useMotionHarness().paused).toBe(true);
  Object.assign(document, { visibilityState: "visible" });
  listeners.get("visibilitychange")!();
  intersection([{ isIntersecting: false }]);
  expect(useMotionHarness().paused).toBe(true);
  intersection([{ isIntersecting: true }]);
  preference.matches = true;
  listeners.get("preference")!();
  motion = useMotionHarness();
  expect(motion.paused).toBe(true);
  expect(motion.browsing).toBe(true);
  motion.togglePause();
  motion.togglePause();
  expect(useMotionHarness().paused).toBe(true);
  if (typeof cleanup === "function") cleanup();
  expect(disconnect).toHaveBeenCalledTimes(2);
  expect(preference.removeEventListener).toHaveBeenCalled();
});


it("allows the owner-requested announcement autoplay while preserving manual pause", () => {
  preference.matches = true;
  useTickerMotion(2, false);
  const cleanup = jest.mocked(useEffect).mock.calls[0][0]();
  intersection([{ isIntersecting: true }]);
  const motion = useTickerMotion(2, false);
  expect(motion.reducedMotion).toBe(false);
  expect(motion.paused).toBe(false);
  motion.togglePause();
  expect(useTickerMotion(2, false).paused).toBe(true);
  // Other consumers continue respecting the same system preference.
  expect(useTickerMotion(2).paused).toBe(true);
  if (typeof cleanup === "function") cleanup();
});
