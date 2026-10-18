import { useEffect } from "react";
import Template from "../template";
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useEffect: jest.fn(),
}));
const originalWindow = globalThis.window,
  originalDocument = globalThis.document;
const handlers = new Map<string, (event?: unknown) => void>();
const timers = new Map<number, () => void>(),
  frames = new Map<number, FrameRequestCallback>();
const target = { scrollIntoView: jest.fn() };
let nextId = 0,
  cleanup: (() => void) | undefined;
const setUrl = (value: string) =>
  Object.assign(window, { location: new URL(value, "http://localhost:3001") });
const flushTimers = () => {
  const pending = [...timers.values()];
  timers.clear();
  pending.forEach((fn) => fn());
};
const flushFrames = () => {
  while (frames.size) {
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach((fn) => fn(0));
  }
};
const click = (href: string, options: object = {}) =>
  handlers.get("click")!({
    button: 0,
    target: {
      closest: () => ({
        href: new URL(href, window.location.href).href,
        target: "",
        hasAttribute: () => false,
        getAttribute: () => href,
      }),
    },
    ...options,
  });
const mount = () => {
  Template({ children: null });
  const effectCleanup = jest.mocked(useEffect).mock.calls.at(-1)![0]();
  cleanup = typeof effectCleanup === "function" ? effectCleanup : undefined;
};
beforeEach(() => {
  jest.clearAllMocks();
  handlers.clear();
  timers.clear();
  frames.clear();
  nextId = 0;
  Object.assign(globalThis, {
    window: {
      location: new URL("http://localhost:3001/en/returns"),
      history: { scrollRestoration: "auto" },
      scrollTo: jest.fn(),
      requestAnimationFrame: jest.fn((fn: FrameRequestCallback) => {
        const id = ++nextId;
        frames.set(id, fn);
        return id;
      }),
      cancelAnimationFrame: jest.fn((id: number) => frames.delete(id)),
      setTimeout: jest.fn((fn: () => void) => {
        const id = ++nextId;
        timers.set(id, fn);
        return id;
      }),
      clearTimeout: jest.fn((id: number) => timers.delete(id)),
      addEventListener: (name: string, fn: (event?: unknown) => void) =>
        handlers.set(name, fn),
      removeEventListener: (name: string) => handlers.delete(name),
    },
    document: {
      documentElement: { scrollTop: 500 },
      body: { scrollTop: 500 },
      getElementById: jest.fn(() => target),
      addEventListener: (name: string, fn: (event?: unknown) => void) =>
        handlers.set(name, fn),
      removeEventListener: (name: string) => handlers.delete(name),
    },
  });
});
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  Object.assign(globalThis, {
    window: originalWindow,
    document: originalDocument,
  });
});
it("scrolls a directly loaded fragment through every scheduled paint without resetting to the top", () => {
  setUrl("/en/returns#condition");
  mount();
  flushFrames();
  expect(document.getElementById).toHaveBeenCalledWith("condition");
  expect(target.scrollIntoView).toHaveBeenCalledWith({
    behavior: "instant",
    block: "start",
  });
  expect(target.scrollIntoView).toHaveBeenCalledTimes(3);
  expect(window.scrollTo).not.toHaveBeenCalled();
  expect(document.documentElement.scrollTop).toBe(500);
});
it("handles native contents links and repeated clicks on the current hash", () => {
  mount();
  flushFrames();
  jest.mocked(window.scrollTo).mockClear();
  setUrl("/en/returns#condition");
  handlers.get("hashchange")!();
  expect(target.scrollIntoView).toHaveBeenCalledTimes(1);
  click("#condition");
  flushTimers();
  expect(target.scrollIntoView).toHaveBeenCalledTimes(2);
  expect(window.scrollTo).not.toHaveBeenCalled();
});
it("respects a fragment on a new route when the delayed internal-link reset runs", () => {
  mount();
  flushFrames();
  jest.mocked(window.scrollTo).mockClear();
  click("/en/shop/vitamin-c#shop-results");
  setUrl("/en/shop/vitamin-c#shop-results");
  flushTimers();
  expect(document.getElementById).toHaveBeenLastCalledWith("shop-results");
  expect(window.scrollTo).not.toHaveBeenCalled();
});
it("keeps ordinary path/query navigation at the top and ignores modified or external clicks", () => {
  mount();
  flushFrames();
  for (const href of ["/en/shop", "/en/returns?page=2"]) {
    click(href);
    setUrl(href);
    flushTimers();
  }
  expect(window.scrollTo).toHaveBeenCalledWith({
    top: 0,
    left: 0,
    behavior: "instant",
  });
  expect(document.body.scrollTop).toBe(0);
  for (const options of [
    { ctrlKey: true },
    { metaKey: true },
    { shiftKey: true },
    { altKey: true },
    { button: 1 },
  ])
    click("/en/other#target", options);
  click("https://outside.example/#target");
  expect(timers.size).toBe(0);
});
it("restores the current fragment on history navigation and resets normally without one", () => {
  mount();
  flushFrames();
  setUrl("/ar/returns#condition");
  handlers.get("popstate")!();
  flushTimers();
  expect(target.scrollIntoView).toHaveBeenCalled();
  setUrl("/ar/returns");
  handlers.get("popstate")!();
  flushTimers();
  expect(window.scrollTo).toHaveBeenLastCalledWith({
    top: 0,
    left: 0,
    behavior: "instant",
  });
});
it("decodes Arabic fragments without interpreting the ID as a selector", () => {
  setUrl("/ar/returns#" + encodeURIComponent("حالة المنتج"));
  mount();
  expect(document.getElementById).toHaveBeenCalledWith("حالة المنتج");
});
it.each(["#%E0%A4", "#missing"])(
  "keeps malformed or missing fragments from throwing or resetting the page: %s",
  (hash) => {
    jest.mocked(document.getElementById).mockReturnValue(null);
    setUrl("/en/returns" + hash);
    expect(mount).not.toThrow();
    flushFrames();
    expect(window.scrollTo).not.toHaveBeenCalled();
    expect(target.scrollIntoView).not.toHaveBeenCalled();
  },
);
it("cancels pending resets and removes all listeners on unmount", () => {
  mount();
  const firstFrame = [...frames.values()][0];
  frames.clear();
  firstFrame(0);
  click("/en/shop#shop-results");
  expect(timers.size).toBe(2);
  expect(frames.size).toBe(1);
  cleanup?.();
  cleanup = undefined;
  expect(timers.size).toBe(0);
  expect(frames.size).toBe(0);
  expect(handlers.size).toBe(0);
});
