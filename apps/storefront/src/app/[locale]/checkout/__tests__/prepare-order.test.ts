import { addCartItem, createCart, setCartAddress, setCartShippingMethod } from "@/lib/medusa";
import { prepareOrder } from "../prepare-order";
import { initialForm } from "../checkout-details";
import type { CheckoutItem } from "../OrderSummary";

jest.mock("@/lib/medusa", () => ({
  addCartItem: jest.fn(), createCart: jest.fn(), setCartAddress: jest.fn(), setCartShippingMethod: jest.fn(),
}));

const form = { ...initialForm, name: "Sara  Ali Hassan", phone: "010 1234 5678", email: " sara@test.dev ", governorate: "Cairo", area: " Maadi ", address: " 1 Street " };
const items = [{ product: { variantId: "variant_1" }, quantity: 2 }] as CheckoutItem[];

beforeEach(() => jest.clearAllMocks());

it("uses the existing cart, and sets its address before its delivery", async () => {
  await expect(prepareOrder({ cartId: "cart_1", items, form, shippingOptionId: "so_1" })).resolves.toBe("cart_1");
  expect(createCart).not.toHaveBeenCalled();
  expect(setCartAddress).toHaveBeenCalledWith("cart_1", "sara@test.dev", {
    firstName: "Sara", lastName: "Ali Hassan", address1: "Maadi, 1 Street", city: "Cairo", countryCode: "eg", phone: "01012345678",
  });
  expect(setCartShippingMethod).toHaveBeenCalledWith("cart_1", "so_1");
  expect(jest.mocked(setCartAddress).mock.invocationCallOrder[0]).toBeLessThan(jest.mocked(setCartShippingMethod).mock.invocationCallOrder[0]);
});

it("builds a new cart from the items when none exists", async () => {
  jest.mocked(createCart).mockResolvedValue({ id: "cart_new" } as never);
  await expect(prepareOrder({ cartId: null, items, form, shippingOptionId: "so_1" })).resolves.toBe("cart_new");
  expect(addCartItem).toHaveBeenCalledWith("cart_new", "variant_1", 2);
});

it("refuses an order with no delivery method", async () => {
  await expect(prepareOrder({ cartId: "cart_1", items, form, shippingOptionId: "" })).rejects.toThrow("Select a shipping method");
  expect(setCartShippingMethod).not.toHaveBeenCalled();
});
