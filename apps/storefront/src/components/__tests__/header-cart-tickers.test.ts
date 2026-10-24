import * as React from "react";
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  __esModule: true,
  useState: jest.fn((...args: unknown[]) => jest.requireActual("react").useState(...args)),
  useTransition: jest.fn(() => jest.requireActual("react").useTransition()),
}));

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Navbar from "../Navbar";
import AnnouncementTicker from "../AnnouncementTicker";
import CartDrawer from "../CartDrawer";
import BrandUniverse from "../BrandUniverse";
import TrendingNow from "../TrendingNow";
import { message, type Locale } from "@/lib/i18n";
import type { Product } from "@/types/product";

jest.mock("@/components/CatalogImage.module.css", () => ({}));
jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: jest.fn() }),
  usePathname: () => "/en",
}));
let mockLocale: Locale = "en";
let mockCustomer: { firstName?: string; email?: string } | null = null;
let mockAuthenticated = false;
let mockLoading = false;
let mockCartOpen = false;
let mockReducedMotion = false;
let mockManualPause = false;
jest.mock("@/context/LanguageContext", () => ({
  useLanguage: () => ({
    language: mockLocale,
    isArabic: mockLocale === "ar",
    t: <T>(v: T) => v,
    msg: (key: Parameters<typeof message>[1]) => message(mockLocale, key),
    setLanguage: jest.fn(),
  }),
  LegacyTranslations: ({ children }: { children: unknown }) => children,
}));
jest.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    customer: mockCustomer,
    isAuthenticated: mockAuthenticated,
    isLoading: mockLoading,
    signOut: jest.fn(),
  }),
}));
jest.mock("@/context/CartContext", () => ({
  useCart: () => ({
    items: [],
    itemCount: 0,
    subtotal: 0,
    isCartOpen: mockCartOpen,
    openCart: jest.fn(),
    closeCart: jest.fn(),
  }),
}));
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, ...props }: { children: never }) =>
    createElement("a", props, children),
}));
jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) =>
    createElement("img", { src, alt }),
}));
jest.mock("../GlobalSearch", () => ({ __esModule: true, default: () => null }));
jest.mock("../MobileBottomNav", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("../DesktopMegaMenu", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("../AccountDropdown", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("../Navbar.module.css", () => ({
  account: "account",
  customerName: "customerName",
  desktopCategories: "desktopCategories",
  utilityStrip: "utilityStrip",
  utilityRight: "utilityRight",
}));
jest.mock("../MobileBottomNav.module.css", () => ({}));
jest.mock("../TrendingNow.module.css", () => ({}));
jest.mock("../BrandUniverse.module.css", () => ({}));
jest.mock("@/hooks/use-ticker-motion", () => ({
  useTickerMotion: (_count: number, respectReducedMotion = true) => ({
    ref: { current: null },
    repetitions: 2,
    reducedMotion: mockReducedMotion && respectReducedMotion,
    manualPause: mockManualPause,
    paused: (mockReducedMotion && respectReducedMotion) || mockManualPause,
    browsing: mockReducedMotion,
    interactions: {},
    togglePause: jest.fn(),
  }),
}));
beforeEach(() => {
  mockLocale = "en";
  mockCustomer = null;
  mockAuthenticated = false;
  mockLoading = false;
  mockCartOpen = false;
  mockReducedMotion = false;
  mockManualPause = false;
});
function accountMarkup() {
  const html = renderToStaticMarkup(createElement(Navbar));
  return html.match(
    /<button[^>]*class="account"[^>]*>([\s\S]*?)<\/button>/,
  )![1];
}
it.each(["en", "ar"] as const)(
  "renders the destination language twice in %s and protects the tokens",
  (locale) => {
    mockLocale = locale;
    const html = renderToStaticMarkup(createElement(Navbar));
    expect(
      html.match(new RegExp(">" + (locale === "ar" ? "ENG" : "AR") + "<", "g")),
    ).toHaveLength(2);
    expect(html.match(/translate="no"/g)).toHaveLength(2);
    expect(html).toContain(
      message(
        locale,
        locale === "ar" ? "nav.switchEnglish" : "nav.switchArabic",
      ),
    );
  },
);
it("replaces guest text with the first name and keeps the existing user icon", () => {
  mockCustomer = { firstName: "  Seif  ", email: "customer@example.com" };
  mockAuthenticated = true;
  const html = accountMarkup();
  expect(html).toContain("<bdi>Seif</bdi>");
  expect(html).not.toMatch(/Sign in|ACCOUNT/);
  expect(html).toContain("lucide-user-round");
  mockCustomer = null;
  mockAuthenticated = false;
  expect(accountMarkup()).toMatch(/SIGN IN|Sign in/);
});
it("uses the email-name fallback and contains long mixed-direction names", () => {
  mockCustomer = { firstName: " ", email: "seif@example.com" };
  mockAuthenticated = true;
  expect(accountMarkup()).toContain("<bdi>seif</bdi>");
  mockCustomer.firstName = "اسم طويل Very long customer name";
  expect(accountMarkup()).toContain(
    'class="customerName" title="اسم طويل Very long customer name"',
  );
  mockCustomer = {};
  expect(accountMarkup()).toContain("<bdi>Account</bdi>");
});
it("does not flash Sign in while restoring a customer session", () => {
  mockLoading = true;
  expect(accountMarkup()).not.toMatch(/SIGN IN|Sign in/);
});
it("makes a closed cart inert and an open cart a named modal", () => {
  let html = renderToStaticMarkup(createElement(CartDrawer));
  expect(html).toContain('inert=""');
  mockCartOpen = true;
  html = renderToStaticMarkup(createElement(CartDrawer));
  expect(html).toContain(
    'role="dialog" aria-modal="true" aria-labelledby="cart-drawer-title"',
  );
  expect(html).not.toContain('inert=""');
  mockLocale = "ar";
  expect(renderToStaticMarkup(createElement(CartDrawer))).toContain(
    message("ar", "cart.close"),
  );
});
it("keeps real localized product destinations with only one keyboard stop per product", () => {
  mockLocale = "ar";
  const product = {
    id: "p1",
    slug: "protein",
    name: "Protein",
    shortName: "Protein",
    image: "/protein.png",
  } as Product;
  const html = renderToStaticMarkup(
    createElement(() => TrendingNow({ products: [product] })),
  );
  expect(html.match(/href="\/ar\/products\/protein"/g)).toHaveLength(4);
  expect(
    html.match(/<a(?![^>]*tabindex="-1")[^>]*href="\/ar\/products\/protein"/g),
  ).toHaveLength(1);
  expect(html.match(/tabindex="-1"/g)).toHaveLength(3);
  expect(html).toContain('aria-hidden="true"');
  expect(html).toContain(">Protein</span>");
  expect(html).not.toContain("<button");
  expect(html).toContain("منتجات رائجة");
});
it("keeps real decorative brand names and a keyboard pause target without controls", () => {
  const html = renderToStaticMarkup(
    createElement(BrandUniverse, { brands: ["Real Brand"] }),
  );
  expect(html).toContain("Real Brand");
  expect(html).toContain('aria-hidden="true"');
  expect(html).toContain('tabindex="0"');
  expect(html).not.toContain("<button");
  expect(
    renderToStaticMarkup(createElement(() => TrendingNow({ products: [] }))),
  ).toBe("");
  expect(
    renderToStaticMarkup(createElement(BrandUniverse, { brands: [] })),
  ).toBe("");
});

it.each(["en", "ar"] as const)(
  "keeps catalog navigation and removes redundant global shortcuts in %s",
  (locale) => {
    mockLocale = locale;
    const roots = ["Alpha", "Beta"].map((name, index) => ({
      id: "category-" + index, name, handle: name.toLowerCase(),
      parent_category_id: null, rank: index, children: [],
    }));
    const html = renderToStaticMarkup(createElement(Navbar, {
      initialDirectory: { roots, error: false },
    }));
    const desktop = html.match(/<nav class="desktopCategories"[^>]*>([\s\S]*?)<\/nav>/)![1];
    expect(desktop.match(/<button /g)).toHaveLength(2);
    expect(desktop).toContain("Alpha");
    expect(desktop).toContain("Beta");
    expect(desktop.match(/<a /g)).toHaveLength(3);
    expect(desktop).toContain('href="/' + locale + '/brands"');
    expect(desktop).toContain('href="/' + locale + '/#health-goals"');
    expect(desktop).toContain('href="/' + locale + '/deals"');
    expect(html).not.toContain("#best-sellers");
    expect(html).not.toContain("#value-sets");
    for (const key of ["nav.new", "nav.shop", "nav.bundles"] as const) {
      expect(html).not.toContain(">" + message(locale, key) + "<");
    }
  },
);

it.each(["en", "ar"] as const)("hides bottom navigation while the mobile drawer is open in %s", (locale) => {
  mockLocale = locale;
  const BottomNav = jest.requireActual("../MobileBottomNav").default;
  expect(renderToStaticMarkup(createElement(BottomNav, { hidden: true, onOpenSearch: jest.fn() }))).toBe("");
  const html = renderToStaticMarkup(createElement(BottomNav, { hidden: false, onOpenSearch: jest.fn() }));
  expect(html).toContain(message(locale, "nav.mobile"));
  expect(html).toContain(message(locale, "nav.account"));
});
it("keeps search and cart in the banner while category navigation scrolls separately", () => {
  const html = renderToStaticMarkup(createElement(Navbar));
  const banner = html.match(/<header[^>]*>([\s\S]*?)<\/header>/)![1];
  expect(banner).toContain(message("en", "nav.search"));
  expect(banner).toContain(message("en", "nav.cart"));
  expect(banner).not.toContain("desktopCategories");
  expect(html).toContain('class="desktopCategories"');
});

it.each(["en", "ar"] as const)("renders truthful localized announcements and named navigation in %s", locale => {
  mockLocale = locale;
  const html = renderToStaticMarkup(createElement(Navbar));
  expect(html).not.toMatch(/SHOP SUPPLEMENTS IN EGP|ENGLISH &amp; ARABIC|تسوق المكملات بالجنيه المصري|العربية والإنجليزية/);
  for (const key of ["announcement.essentials", "announcement.range", "announcement.collection", "nav.preferences", "nav.mainCategories", "nav.shopBy"] as const) {
    expect(html).toContain(message(locale, key).replace(/&/g, "&amp;"));
  }
  expect(html).toContain('role="region" aria-label="' + message(locale, "nav.preferences") + '"');
});
it("announces one message cycle and exposes a keyboard pause target without buttons", () => {
  const html = renderToStaticMarkup(createElement(AnnouncementTicker));
  const primary = html.match(/data-ticker-base="true"[^>]*>([\s\S]*?)<\/div>/)![1];
  expect(primary.match(/Find your daily essentials/g)).toHaveLength(1);
  expect(html.match(/Find your daily essentials/g)).toHaveLength(4);
  expect(html.match(/aria-hidden="true"/g)!.length).toBeGreaterThan(3);
  expect(html).toContain('role="group" aria-label="Announcements" tabindex="0"');
  expect(html).not.toContain("<button");
});
it("autoplays announcements under reduced motion as requested, without a pause button", () => {
  mockReducedMotion = true;
  const html = renderToStaticMarkup(createElement(AnnouncementTicker));
  expect(html).toContain('data-autoplay="true"');
  expect(html).toContain('role="group" aria-label="Announcements" tabindex="0"');
  expect(html).toContain("animation-play-state:running");
  expect(html).not.toContain("<button");
});

it.each(["en", "ar"] as const)("names only language/currency preferences, excluding deals and announcements in %s", locale => {
  mockLocale = locale;
  const html = renderToStaticMarkup(createElement(Navbar));
  const preferences = html.match(/<div class="utilityRight"[^>]*>([\s\S]*?)<\/div>/)![1];
  expect(html).toContain('class="utilityRight" role="region" aria-label="' + message(locale, "nav.preferences") + '"');
  expect(preferences).toContain(message(locale, locale === "ar" ? "nav.switchEnglish" : "nav.switchArabic"));
  expect(preferences).not.toContain("/deals");
  expect(preferences).not.toContain(message(locale, "announcement.essentials"));
});
it("autoplays brand names with reduced motion enabled and no pause button", () => {
  mockReducedMotion = true;
  const html = renderToStaticMarkup(createElement(BrandUniverse, { brands: ["Real Brand"] }));
  expect(html).toContain("Real Brand");
  expect(html).toContain("animation-play-state:running");
  expect(html).toContain('tabindex="0"');
  expect(html).not.toContain("<button");
  expect(html).not.toContain("data-browsing");
});

it.each(["en", "ar"] as const)("names the mobile drawer as a dialog and keeps the closed layer inert in %s", locale => {
  mockLocale = locale;
  const html = renderToStaticMarkup(createElement(Navbar));
  const dialog = html.match(/<aside[^>]*>/)![0];
  expect(dialog).toContain('role="dialog"');
  expect(dialog).toContain('aria-label="' + message(locale, "nav.menu") + '"');
  expect(dialog).toContain('tabindex="-1"');
  expect(dialog).not.toContain('aria-modal="true"');
  expect(html).toMatch(/aria-hidden="true" inert=""[^>]*><aside/);
});

it.each(["en", "ar"] as const)("publishes no removed shop filters in %s navigation", locale => {
  mockLocale = locale;
  const html = renderToStaticMarkup(createElement(Navbar));
  const links = Array.from(html.matchAll(/href="([^"]+)"/g), match => match[1].replaceAll("&amp;", "&"));
  expect(links).toContain("/" + locale + "/#health-goals");
  for (const href of links) {
    const query = new URL(href, "https://example.test").searchParams;
    for (const key of ["form", "diet", "allergen", "rating", "sort", "availability"]) expect(query.has(key)).toBe(false);
  }
});

it.each(["en", "ar"] as const)("opens Brands and Health Goals as mobile sub-menus and shows Deals without an arrow in %s", locale => {
  mockLocale = locale;
  const html = renderToStaticMarkup(createElement(Navbar));
  const label = 'aria-label="' + message(locale, "nav.shopBy") + '"';
  const shopBy = html.slice(html.indexOf(label), html.indexOf("</nav>", html.indexOf(label)));
  const buttons = Array.from(shopBy.matchAll(/<button type="button"[^>]*>(.*?)<\/button>/g), match => match[1]);
  expect(buttons).toHaveLength(2);
  expect(buttons[0]).toContain(message(locale, "nav.brands"));
  expect(buttons[1]).toContain(message(locale, "nav.health"));
  expect(shopBy).not.toContain("/brands\"");
  expect(shopBy).not.toContain("#health-goals");
  const deals = shopBy.slice(shopBy.indexOf('href="/' + locale + '/deals"'));
  expect(deals).toContain(message(locale, "nav.deals"));
  expect(deals).not.toContain("lucide-chevron-right");
});

it.each(["en", "ar"] as const)("gives the utility strip to announcements without a flash-deals promotion in %s", locale => {
  mockLocale = locale;
  const html = renderToStaticMarkup(createElement(Navbar));
  const strip = html.slice(html.indexOf('class="utilityStrip"'), html.indexOf("<header"));
  expect(strip).toContain(message(locale, "announcement.label"));
  expect(strip).not.toContain('/deals');
  expect(strip).not.toContain('24H PICKS');
  // Deals remains a normal navigation destination.
  expect(html).toContain(`href="/${locale}/deals"`);
});

it("renders the trending heading and one real cycle for two products without invented selections", () => {
  const products = [{ id: "one", slug: "one", name: "First product", image: "" }, { id: "two", slug: "two", name: "Second product", image: "/two.png" }] as Product[];
  const html = renderToStaticMarkup(createElement(() => TrendingNow({ products })));
  expect(html).toContain("TRENDING PRODUCTS");
  expect(html).not.toContain("VI2 PICKS");
  expect(html).not.toContain("EXPLORE PRODUCTS");
  expect(html).not.toContain('src=""');
  expect(html).toContain('role="img" aria-label="First product"');
  expect(html).not.toContain("<button");
  for (const slug of ["one", "two"]) {
    const links = [...html.matchAll(new RegExp(`<a[^>]*href="/en/products/${slug}"[^>]*>`, "g"))].map(match => match[0]);
    expect(links).toHaveLength(4);
    expect(links.filter(link => !link.includes('tabindex="-1"'))).toHaveLength(1);
  }
});

it("does not close a hover-opened account on its first pointer click, while keyboard activation still toggles", () => {
  const cells: unknown[] = [];
  const stateSpy = jest.spyOn(React, "useState").mockImplementation(((initial?: unknown) => {
    const index = cells.length;
    cells.push(typeof initial === "function" ? initial() : initial);
    return [cells[index], (value: unknown) => { cells[index] = typeof value === "function" ? value(cells[index]) : value; }];
  }) as typeof React.useState);
  let tree: React.ReactNode;
  type Events = { className?: string; children?: React.ReactNode; onPointerEnter?: (event: { pointerType: string }) => void; onClick?: (event: { detail: number }) => void };
  const find = (node: React.ReactNode, predicate: (props: Events) => boolean): React.ReactElement<Events> | undefined => {
    for (const child of React.Children.toArray(node)) {
      if (!React.isValidElement<Events>(child)) continue;
      if (predicate(child.props)) return child;
      const found = find(child.props.children, predicate);
      if (found) return found;
    }
  };
  try {
    renderToStaticMarkup(createElement(() => { tree = Navbar({}); return tree; }));
    const account = find(tree, props => props.className === "account")!;
    const wrapper = find(tree, props => !!props.onPointerEnter && React.Children.toArray(props.children).some(child => React.isValidElement<Events>(child) && child.props.className === "account"))!;
    const before = [...cells];
    wrapper.props.onPointerEnter!({ pointerType: "mouse" });
    const accountIndex = cells.findIndex((value, index) => value === true && before[index] !== true);
    expect(accountIndex).toBeGreaterThanOrEqual(0);
    account.props.onClick!({ detail: 1 });
    expect(cells[accountIndex]).toBe(true);
    account.props.onClick!({ detail: 1 });
    expect(cells[accountIndex]).toBe(false);
    wrapper.props.onPointerEnter!({ pointerType: "touch" });
    expect(cells[accountIndex]).toBe(false);
    account.props.onClick!({ detail: 1 });
    expect(cells[accountIndex]).toBe(true);
    account.props.onClick!({ detail: 1 });
    expect(cells[accountIndex]).toBe(false);
    account.props.onClick!({ detail: 0 });
    expect(cells[accountIndex]).toBe(true);
    account.props.onClick!({ detail: 0 });
    expect(cells[accountIndex]).toBe(false);
  } finally {
    stateSpy.mockRestore();
  }
});

it.each(["en", "ar"] as const)("distinguishes category retry from the homepage product retry in %s", locale => {
  mockLocale = locale;
  const Status = jest.requireActual("../CategoryStatus").default;
  const html = renderToStaticMarkup(createElement(Status, { error: true }));
  expect(html).toContain(message(locale, "catalog.categoryError"));
  expect(html).toContain(message(locale, "catalog.categoryRetry"));
  expect(html).not.toContain(message(locale, "catalog.error"));
});

it.each(["en", "ar"] as const)("avoids stale metadata prefetch for catalog links in %s", locale => {
  mockLocale = locale;
  const LocalLink = jest.requireActual("../LocaleLink").default;
  for (const href of ["/shop", "/shop/vitamin-c?q=whey", "/shop?q=whey", "/shop#results"]) {
    const link = LocalLink({ href, prefetch: true });
    expect(link.props.href).toBe("/" + locale + href);
    expect(link.props.prefetch).toBe(false);
  }
  expect(LocalLink({ href: "/account", prefetch: true }).props.prefetch).toBe(true);
  expect(LocalLink({ href: "/shopping", prefetch: true }).props.prefetch).toBe(true);
});
