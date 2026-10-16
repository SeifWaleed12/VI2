import { checkoutTotal } from "../checkout-total";

it("adds the selected delivery before Medusa has it on the cart", () => {
  expect(checkoutTotal(100, 0, 100, 0, 70)).toBe(170);
});

it("does not count delivery twice once the cart has it", () => {
  expect(checkoutTotal(170, 70, 100, 0, 70)).toBe(170);
});

it("uses the item sum while the cart is still loading, minus discounts", () => {
  expect(checkoutTotal(0, 0, 100, 20, 70)).toBe(150);
  expect(checkoutTotal(0, 0, 10, 50, 0)).toBe(0);
});
