import { useEffect } from "react";
import { useProductRailScroll } from "../use-product-rail-scroll";

const mockCycle = { scrollWidth: 1000 };
const mockViewport = { scrollLeft: 0, querySelector: () => mockCycle };
const mockFrames = new Map<number, FrameRequestCallback>();
let mockNext = 0;
const mockDisconnect = jest.fn();
jest.mock("react", () => ({
  useRef: (initial: unknown) => ({ current: initial === null ? mockViewport : initial }),
  useEffect: jest.fn(),
}));
const oldFrame = globalThis.requestAnimationFrame;
const oldCancel = globalThis.cancelAnimationFrame;
const oldResize = globalThis.ResizeObserver;
function tick(time: number) {
  const entry = [...mockFrames.entries()].at(-1)!;
  mockFrames.delete(entry[0]);
  entry[1](time);
}
beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockFrames.clear(); mockNext = 0; mockViewport.scrollLeft = 0;
  Object.assign(globalThis, {
    requestAnimationFrame: jest.fn((callback: FrameRequestCallback) => { mockFrames.set(++mockNext, callback); return mockNext; }),
    cancelAnimationFrame: jest.fn((id: number) => { mockFrames.delete(id); }),
    ResizeObserver: class { observe() {} disconnect = mockDisconnect; },
  });
});
afterEach(() => {
  jest.useRealTimers();
  Object.assign(globalThis, { requestAnimationFrame: oldFrame, cancelAnimationFrame: oldCancel, ResizeObserver: oldResize });
});
it("moves steadily, wraps at the identical cycle and cancels its frame on cleanup", () => {
  useProductRailScroll(false, "one,two");
  const cleanup = jest.mocked(useEffect).mock.calls[1][0]();
  tick(0); tick(16);
  expect(mockViewport.scrollLeft).toBeCloseTo(0.448);
  mockViewport.scrollLeft = 999.9;
  tick(32);
  expect(mockViewport.scrollLeft).toBeCloseTo(0.348);
  if (typeof cleanup === "function") cleanup();
  expect(mockFrames.size).toBe(0);
  expect(mockDisconnect).toHaveBeenCalled();
});
it("does not start scrolling when hover, focus or visibility has paused the ticker", () => {
  mockViewport.scrollLeft = 230;
  useProductRailScroll(true, "one,two");
  jest.mocked(useEffect).mock.calls[1][0]();
  expect(requestAnimationFrame).not.toHaveBeenCalled();
  expect(mockViewport.scrollLeft).toBe(230);
});
it("leaves a native touch swipe alone and resumes from its new position after inertia", () => {
  const rail = useProductRailScroll(false, "one,two");
  const cleanup = jest.mocked(useEffect).mock.calls[1][0]();
  tick(0);
  rail.touchInteractions.onPointerDown({ pointerType: "touch" } as never);
  mockViewport.scrollLeft = 200;
  tick(16);
  expect(mockViewport.scrollLeft).toBe(200);
  rail.touchInteractions.onPointerUp({ pointerType: "touch" } as never);
  jest.advanceTimersByTime(1000);
  rail.touchInteractions.onScroll();
  jest.advanceTimersByTime(1000);
  tick(24);
  expect(mockViewport.scrollLeft).toBe(200);
  jest.advanceTimersByTime(500);
  tick(40);
  expect(mockViewport.scrollLeft).toBeCloseTo(200.448);
  if (typeof cleanup === "function") cleanup();
});
