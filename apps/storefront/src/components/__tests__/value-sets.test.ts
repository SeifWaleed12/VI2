import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ValueSets from "../ValueSets";

jest.mock("../ValueSets.module.css", () => ({ was: "was" }));
jest.mock("@/components/LocaleLink", () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: never }) => createElement("a", { href }, children),
}));
jest.mock("@/context/LanguageContext", () => ({ useLanguage: () => ({ t: (text: string) => text, msg: (key: string) => (key === "nav.egp" ? "EGP" : key) }) }));
jest.mock("@/hooks/use-cart-add", () => ({ useCartAdd: () => ({ pending: false, added: false, failed: false, handleAdd: jest.fn() }) }));

const bundle = { id: "prod_set", slug: "strength-set", name: "Strength set", brand: "Vi2", image: "", price: 1800, compareAtPrice: 2100, variantId: "variant_set" };

it("is hidden when no product is tagged as a bundle", () => {
  expect(renderToStaticMarkup(createElement(ValueSets, { bundles: [] }))).toBe("");
});

it("shows each bundle as one product with its sale and normal price", () => {
  const html = renderToStaticMarkup(createElement(ValueSets, { bundles: [bundle as never] }));
  expect(html).toContain("Strength set");
  expect(html).toContain('href="/products/strength-set"');
  expect(html).toContain("1,800 EGP");
  expect(html).toContain('<s class="was">2,100 EGP</s>');
  expect(html).toContain("ADD SET");
});
