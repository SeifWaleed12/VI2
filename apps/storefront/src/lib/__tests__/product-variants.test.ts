import { initialSelection, matchesSelection } from "../product-variants";
import type { ProductVariant } from "@/types/product";

const variants: ProductVariant[] = [
  { id: "small", title: "S / Vanilla", options: { Size: "S", Flavor: "Vanilla" }, price: 100, stock: 3, inStock: true },
  { id: "medium", title: "M / Chocolate", options: { Size: "M", Flavor: "Chocolate" }, price: 150, stock: 2, inStock: true },
];
it("initializes from a real combination rather than independent first values", () => {
  expect(initialSelection([
    { id: "s", title: "Size", values: ["M", "S"] },
    { id: "f", title: "Flavor", values: ["Vanilla", "Chocolate"] },
  ], variants)).toEqual({ Size: "S", Flavor: "Vanilla" });
});
it("rejects an impossible combination instead of falling back to the first variant", () => {
  expect(variants.find((variant) => matchesSelection(variant, { Size: "M", Flavor: "Vanilla" }))).toBeUndefined();
  expect(variants.find((variant) => matchesSelection(variant, { Size: "M", Flavor: "Chocolate" }))?.id).toBe("medium");
});
it("requires every choice, handles normalized titles/values, and never treats missing options as a match", () => {
  expect(matchesSelection(variants[0], { " size ": " s ", FLAVOR: "VANILLA" })).toBe(true);
  expect(matchesSelection({ ...variants[0], options: { Size: "S" } }, { Size: "S", Flavor: "Vanilla" })).toBe(false);
  expect(matchesSelection({ ...variants[0], options: {} }, { Size: "S" })).toBe(false);
});
it("permits the native default variant when there are no displayed choices", () => {
  expect(initialSelection([], variants)).toEqual({});
  expect(matchesSelection(variants[0], {})).toBe(true);
});
