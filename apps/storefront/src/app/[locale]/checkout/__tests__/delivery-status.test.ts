import { deliveryStatus } from "../delivery-status";

it("waits while the cart itself is still loading", () => {
  expect(deliveryStatus(null, true, "loading", 0)).toBe("loading");
});

it("asks to retry the cart, not the options, when no cart could be loaded", () => {
  expect(deliveryStatus(null, false, "loading", 0)).toBe("no-cart");
  expect(deliveryStatus(null, false, "failed", 0)).toBe("no-cart");
});

it("tells a failed request apart from Medusa answering with no options", () => {
  expect(deliveryStatus("cart_1", false, "failed", 0)).toBe("failed");
  expect(deliveryStatus("cart_1", false, "loaded", 0)).toBe("empty");
});

it("shows the options once they arrive", () => {
  expect(deliveryStatus("cart_1", false, "loading", 0)).toBe("loading");
  expect(deliveryStatus("cart_1", false, "loaded", 1)).toBe("ready");
});
