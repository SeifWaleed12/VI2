import { useDrawerFocus } from "../use-drawer-focus";
import { useEffect } from "react";
jest.mock("react", () => ({ useEffect: jest.fn() }));
const handlers = new Map<string, (event: unknown) => void>();
class Element {
  isConnected = true;
  children: Element[] = [];
  hidden = false;
  focus = jest.fn(() => {
    Object.assign(document, { activeElement: this });
  });
  matches() {
    return false;
  }
  closest() {
    return this.hidden ? {} : null;
  }
  getClientRects() {
    return [1];
  }
  querySelectorAll() {
    return this.children;
  }
  contains(target: Element) {
    return target === this || this.children.includes(target);
  }
}
const oldDocument = globalThis.document,
  oldHTMLElement = globalThis.HTMLElement;
beforeEach(() => {
  handlers.clear();
  jest.clearAllMocks();
  Object.assign(globalThis, {
    HTMLElement: Element,
    document: {
      activeElement: null,
      addEventListener: (name: string, handler: (event: unknown) => void) =>
        handlers.set(name, handler),
      removeEventListener: (name: string) => handlers.delete(name),
    },
  });
});
afterEach(() =>
  Object.assign(globalThis, {
    document: oldDocument,
    HTMLElement: oldHTMLElement,
  }),
);
it("focuses the close control, wraps Tab both ways, blocks escaped focus, closes with Escape and restores the opener", () => {
  const opener = new Element(),
    drawer = new Element(),
    first = new Element(),
    last = new Element(),
    close = jest.fn();
  drawer.children = [first, last];
  Object.assign(document, { activeElement: opener });
  useDrawerFocus({ current: drawer } as never, true, close);
  const cleanup = jest.mocked(useEffect).mock.calls[0][0]();
  expect(first.focus).toHaveBeenCalledTimes(1);
  const preventDefault = jest.fn();
  handlers.get("keydown")!({ key: "Tab", shiftKey: true, preventDefault });
  expect(last.focus).toHaveBeenCalledTimes(1);
  handlers.get("keydown")!({ key: "Tab", shiftKey: false, preventDefault });
  expect(first.focus).toHaveBeenCalledTimes(2);
  Object.assign(document, { activeElement: opener });
  handlers.get("focusin")!({ target: opener });
  expect(first.focus).toHaveBeenCalledTimes(3);
  handlers.get("keydown")!({ key: "Escape", preventDefault });
  expect(close).toHaveBeenCalledTimes(1);
  if (typeof cleanup === "function") cleanup();
  expect(opener.focus).toHaveBeenCalledTimes(1);
  expect(handlers.size).toBe(0);
});
it("leaves closed drawers alone and handles a drawer without interactive content", () => {
  const drawer = new Element(),
    close = jest.fn();
  useDrawerFocus({ current: drawer } as never, false, close);
  expect(jest.mocked(useEffect).mock.calls[0][0]()).toBeUndefined();
  useDrawerFocus({ current: drawer } as never, true, close);
  jest.mocked(useEffect).mock.calls[1][0]();
  expect(drawer.focus).toHaveBeenCalled();
  handlers.get("keydown")!({ key: "Tab", preventDefault: jest.fn() });
  expect(drawer.focus).toHaveBeenCalledTimes(2);
});
