import * as React from "react";
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  __esModule: true,
  useState: jest.fn((...args: unknown[]) => jest.requireActual("react").useState(...args)),
  useTransition: jest.fn(() => jest.requireActual("react").useTransition()),
}));

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ShopClient, { type ShopProps } from "../ShopClient";
import { message } from "@/lib/i18n";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));
const mockNavigationPush = jest.fn();
jest.mock("@/hooks/use-locale-router", () => ({
  useLocaleRouter: () => ({ push: mockNavigationPush }),
}));
jest.mock("@/components/LocaleLink", () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: never }) =>
    createElement("a", { ...props, href }, children),
}));
jest.mock("@/components/ProductCard", () => ({
  __esModule: true,
  default: ({ product }: { product: { id: string } }) =>
    createElement("article", {}, product.id),
}));
jest.mock("../Shop.module.css", () => ({}));
const props: ShopProps = {
  locale: "en",
  page: {
    products: [{ id: "product_121" } as never],
    count: 137,
    limit: 24,
    offset: 120,
  },
  categories: [],
  brands: [
    {
      id: "brand_real",
      name: "A real directory brand",
      slug: "real",
      status: "active",
    },
  ],
  category: null,
  categoryError: false,
  brandError: false,
  handle: "",
  query: "page=6&q=protein&brand_id=brand_real",
  filters: { q: "protein", brandIds: ["brand_real"], page: 6 },
  error: null,
};
const render = (overrides: Partial<ShopProps> = {}) =>
  renderToStaticMarkup(createElement(ShopClient, { ...props, ...overrides }));
it("renders backend products without a second browser filter, totals and real directory brands", () => {
  const html = render();
  expect(html).toContain("product_121");
  expect(html).toContain("137 products");
  expect(html).toContain("121");
  expect(html).toContain("A real directory brand");
  expect(html).toContain("page=5");
  expect(html).not.toContain("page=7");
  expect(html).not.toMatch(
    /HEALTH GOAL|ALLERGEN-FREE|IN STOCK ONLY|Price: Low|All Diets/,
  );
});
it("renders Arabic interface copy before effects or text replacement", () => {
  const html = render({ locale: "ar" });
  expect(html).toContain(message("ar", "shop.title"));
  expect(html).toContain(message("ar", "shop.search"));
  expect(html).toContain("١٣٧");
  expect(html).toContain("data-no-translate");
  expect(html).toContain('aria-haspopup="dialog"');
  expect(html).toContain('aria-labelledby="shop-filters-title"');
});
it("offers localized recovery for invalid filters, outages, empty results and an expired page", () => {
  expect(render({ error: "invalid" })).toContain(
    message("en", "shop.invalidTitle"),
  );
  expect(render({ error: "unavailable" })).toContain(
    message("en", "catalog.retry"),
  );
  expect(
    render({ page: { products: [], count: 0, limit: 24, offset: 0 } }),
  ).toContain(message("en", "shop.emptyTitle"));
  expect(
    render({ page: { products: [], count: 1, limit: 24, offset: 120 } }),
  ).toContain(message("en", "shop.firstPage"));
});

it("uses ordinary navigation links on desktop, without disabled fields or immediate-change radios", () => {
  const html = render();
  expect(html).not.toContain('type="radio"');
  expect(html).not.toContain('type="checkbox"');
  expect(html).not.toContain('<fieldset disabled');
  expect(html).toContain('aria-current="true"');
  expect(html).toContain('href="/shop?q=protein"');
});
it("has only one live status region for an empty result", () => {
  const html = render({ page: { products: [], count: 0, limit: 24, offset: 0 } });
  expect(html.match(/role="status"/g)).toHaveLength(1);
});

it.each(["en", "ar"] as const)("targets focusable results when changing categories in %s, while brand links retain their focus", locale => {
  const html = render({ locale, categories: [{ id: "pcat_c", handle: "vitamin-c", name: "Vitamin C", parent_category_id: null, children: [] }] });
  expect(html).toContain('href="/shop/vitamin-c?q=protein&amp;brand_id=brand_real#shop-results"');
  expect(html).toContain('id="shop-results" tabindex="-1"');
  expect(html).toContain('href="/shop?q=protein"');
  expect(html).not.toContain('href="/shop?q=protein#shop-results"');
});

it.each(["", "vitamin-c"])("moves mobile category selection to results only when the category changes from %s", initialHandle => {
  const selection = { handle: "vitamin-c", brandIds: ["brand_real"] };
  const stateSpy = jest.spyOn(React, "useState").mockImplementation(((initial?: unknown) => {
    const value = initial && typeof initial === "object" && "brandIds" in initial ? selection : initial;
    return [value, jest.fn()];
  }) as typeof React.useState);
  const transitionSpy = jest.spyOn(React, "useTransition").mockReturnValue([false, action => { void action(); }]);
  let tree: React.ReactNode;
  const findApply = (node: React.ReactNode): React.ReactElement<{ children?: React.ReactNode; onClick?: () => void }> | undefined => {
    for (const child of React.Children.toArray(node)) {
      if (!React.isValidElement<{ children?: React.ReactNode; onClick?: () => void }>(child)) continue;
      if (child.type === "button" && child.props.children === message("en", "shop.applyFilters")) return child;
      const found = findApply(child.props.children);
      if (found) return found;
    }
  };
  try {
    mockNavigationPush.mockClear();
    renderToStaticMarkup(createElement(() => { tree = ShopClient({ ...props, handle: initialHandle }); return tree; }));
    findApply(tree)!.props.onClick!();
    const [destination, options] = mockNavigationPush.mock.calls[0];
    expect(destination).toContain("/shop/vitamin-c?");
    expect(destination).toContain("q=protein");
    expect(destination).toContain("brand_id=brand_real");
    expect(destination.endsWith("#shop-results")).toBe(initialHandle !== "vitamin-c");
    expect(options).toEqual({ scroll: initialHandle !== "vitamin-c" });
  } finally {
    stateSpy.mockRestore();
    transitionSpy.mockRestore();
  }
});