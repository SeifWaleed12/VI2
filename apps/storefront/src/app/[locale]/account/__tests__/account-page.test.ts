import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import AccountClient from "../AccountClient";
import AccountOrders, { OrderDetail, OrderList } from "../AccountOrders";
import AccountDropdown from "@/components/AccountDropdown";
import ChangePasswordSection from "../ChangePasswordSection";
import { accountMetadata, accountPage } from "../AccountRoute";
import { accountAmount, accountDate } from "@/lib/account-format";
import { accountStatus } from "@/lib/account-copy";
import { changePassword, getCustomerOrders } from "@/lib/medusa";
import type { Order } from "@/types/order";
import type { Locale } from "@/lib/i18n";

jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useEffect: jest.fn((effect, deps) =>
    jest.requireActual("react").useEffect(effect, deps),
  ),
  useState: jest.fn((initial?: unknown) =>
    jest.requireActual("react").useState(initial),
  ),
}));
jest.mock("../Account.module.css", () => ({}));
jest.mock("@/components/AccountDropdown.module.css", () => ({}));
jest.mock("@/components/ui/Button.module.css", () => ({}));
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, ...props }: { children: never }) =>
    createElement("a", props, children),
}));
jest.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
  useRouter: () => ({ replace: jest.fn() }),
}));
jest.mock("@/hooks/use-locale-router", () => ({
  useLocaleRouter: () => ({ replace: jest.fn() }),
}));
let mockLocale: Locale = "en";
let mockAuthenticated = true;
let mockLoading = false;
let mockCustomer = {
  id: "cus_a",
  firstName: "Seif",
  lastName: "Waleed",
  email: "seif@example.invalid",
  phone: "",
};
jest.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    customer: mockAuthenticated ? mockCustomer : null,
    isAuthenticated: mockAuthenticated,
    isLoading: mockLoading,
    signOut: jest.fn(),
  }),
}));
jest.mock("@/context/LanguageContext", () => ({
  useLanguage: () => ({
    language: mockLocale,
    isArabic: mockLocale === "ar",
    setLanguage: jest.fn(),
    t: (value: string) => value,
  }),
}));
jest.mock("@/lib/medusa", () => ({
  getCustomerOrders: jest.fn(),
  changePassword: jest.fn(),
}));
const order: Order = {
  id: "order_owned",
  reference: "VI2-41",
  status: "completed",
  paymentStatus: "captured",
  currencyCode: "EGP",
  email: "seif@example.invalid",
  createdAt: "2026-10-10T12:00:00Z",
  items: [
    {
      id: "item1",
      productId: "p1",
      variantId: "v1",
      name: "Vitamin D3",
      price: 250,
      quantity: 2,
      total: 480,
    },
  ],
  itemSubtotal: 500,
  shippingTotal: 40,
  discountTotal: 20,
  taxTotal: 0,
  total: 520,
};
beforeEach(() => {
  mockLocale = "en";
  mockAuthenticated = true;
  mockLoading = false;
  mockCustomer = {
    id: "cus_a",
    firstName: "Seif",
    lastName: "Waleed",
    email: "seif@example.invalid",
    phone: "",
  };
  jest
    .mocked(React.useState)
    .mockImplementation((initial?: unknown) =>
      jest.requireActual("react").useState(initial),
    );
  jest.mocked(changePassword).mockReset();
  jest.mocked(getCustomerOrders).mockReset();
  jest
    .mocked(React.useEffect)
    .mockImplementation((effect, deps) =>
      jest.requireActual("react").useEffect(effect, deps),
    );
});
it.each(["en", "ar"] as const)(
  "renders the dashboard with three valid localized destinations (%s)",
  (locale) => {
    mockLocale = locale;
    const html = renderToStaticMarkup(createElement(AccountClient, { locale }));
    for (const section of ["information", "orders", "points"])
      expect(html).toContain('href="/' + locale + "/account/" + section + '"');
    expect(html).toContain(
      locale === "ar"
        ? "المكافآت غير متاحة حالياً."
        : "Rewards are not available yet.",
    );
    expect(html).not.toMatch(/Buy It Again|My Favourites|vi2-last-order|520/);
    expect(html).toContain("data-no-translate");
  },
);
it("does not flash or expose customer data while loading or signed out", () => {
  mockLoading = true;
  expect(renderToStaticMarkup(createElement(AccountClient))).not.toContain(
    "Seif",
  );
  mockLoading = false;
  mockAuthenticated = false;
  const html = renderToStaticMarkup(
    createElement(AccountClient, { section: "information" }),
  );
  expect(html).not.toContain("seif@example.invalid");
  expect(html).toContain("next=%2Faccount%2Finformation");
});
it("uses the email-name fallback without showing undefined", () => {
  mockCustomer.firstName = "";
  mockCustomer.lastName = "";
  const html = renderToStaticMarkup(createElement(AccountClient));
  expect(html).toContain("<bdi>seif</bdi>");
  expect(html).not.toContain("undefined");
});
it.each(["en", "ar"] as const)(
  "keeps the dropdown style and removes unsupported links (%s)",
  (locale) => {
    mockLocale = locale;
    const html = renderToStaticMarkup(
      createElement(AccountDropdown, {
        open: true,
        isArabic: locale === "ar",
        onClose: jest.fn(),
      }),
    );
    expect(
      html.match(new RegExp('href="/' + locale + '/account/information"', "g")),
    ).toHaveLength(2);
    expect(html).toContain("/account/orders");
    expect(html).toContain("/account/points");
    expect(html).not.toMatch(
      /#saved|#reorder|Buy It Again|My Favourites|اشترِ مرة أخرى|المفضلة/,
    );
    expect(html).toContain("lucide-user-round");
  },
);
it("shows account label/value rows with accessible edit controls", () => {
  const html = renderToStaticMarkup(
    createElement(AccountClient, { section: "information" }),
  );
  expect(html).toContain("seif@example.invalid");
  expect(html).toContain("Not provided");
  expect(html).toContain('aria-label="Edit name"');
  expect(html).toContain('aria-expanded="false"');
});
it("uses native monetary totals without converting major units or inventing delivery", () => {
  const html = renderToStaticMarkup(
    createElement(OrderDetail, { order, locale: "en" }),
  );
  expect(html).toContain(accountAmount(520, "EGP", "en"));
  expect(html).toContain(accountAmount(480, "EGP", "en"));
  expect(html).toContain("Completed");
  expect(html).not.toContain("Delivered");
  expect(html).not.toContain("seif@example.invalid");
});
it.each(["en", "ar"] as const)(
  "provides honest recent-order and empty states (%s)",
  (locale) => {
    mockLocale = locale;
    const html = renderToStaticMarkup(
      createElement(OrderList, { orders: [order], locale }),
    );
    expect(html).toContain("/account/orders?order=order_owned");
    expect(html).toContain("VI2-41");
    expect(
      renderToStaticMarkup(createElement(OrderList, { orders: [], locale })),
    ).toContain('href="/' + locale + '/shop"');
  },
);
it("handles invalid dates, unknown statuses and currency formatting", () => {
  expect(accountDate("invalid", "en")).toBe("Date unavailable");
  expect(accountStatus("ar", "delivered")).toBe("الحالة غير متاحة");
  expect(accountAmount(520, "EGP", "en")).toMatch(/520/);
  expect(accountAmount(1, "invalid-code", "en")).toBe("1 invalid-code");
});
it("renders locale-aware private routes and metadata on the server", async () => {
  const props = {
    params: Promise.resolve({ locale: "ar" }),
    searchParams: Promise.resolve({ order: "order_owned" }),
  };
  expect(await accountMetadata(props, "information")).toEqual({
    title: "بيانات الحساب | Vi2",
    robots: { index: false, follow: false },
  });
  const page = await accountPage(props, "orders");
  expect(page.props).toMatchObject({
    locale: "ar",
    section: "orders",
    selectedOrder: "order_owned",
  });
  await expect(
    accountPage({ params: Promise.resolve({ locale: "xx" }) }, "dashboard"),
  ).rejects.toThrow("NOT_FOUND");
});
function passwordForm(values: unknown[]) {
  let index = 0;
  jest
    .mocked(React.useState)
    .mockImplementation(() => [values[index++], jest.fn()] as never);
  return ChangePasswordSection({ locale: "en" });
}
it("does not call the password API for mismatched confirmation", async () => {
  const form = passwordForm([
    "current-pass",
    "new-password",
    "different",
    false,
    false,
    null,
  ]);
  await form.props.onSubmit({ preventDefault: jest.fn() });
  expect(changePassword).not.toHaveBeenCalled();
});
it("preserves the working password service and contains transport failures", async () => {
  const form = passwordForm([
    "current-pass",
    "new-password",
    "new-password",
    false,
    false,
    null,
  ]);
  jest.mocked(changePassword).mockRejectedValueOnce(new Error("offline"));
  await expect(
    form.props.onSubmit({ preventDefault: jest.fn() }),
  ).resolves.toBeUndefined();
  expect(changePassword).toHaveBeenCalledWith("current-pass", "new-password");
});

it("never renders a previous customer's cached order rows", () => {
  let call = 0;
  const stale = { owner: "cus_old", attempt: 0, orders: [order], error: false };
  jest
    .mocked(React.useState)
    .mockImplementation(() => [call++ === 0 ? 0 : stale, jest.fn()] as never);
  const html = renderToStaticMarkup(
    createElement(AccountOrders, { locale: "en", selectedOrder: "" }),
  );
  expect(html).toContain("Loading your orders");
  expect(html).not.toContain("VI2-41");
});
it("drops an in-flight result when the customer changes or the view unmounts", async () => {
  const writeResult = jest.fn();
  let resolveOrders!: (orders: Order[]) => void;
  jest.mocked(getCustomerOrders).mockReturnValueOnce(
    new Promise((resolve) => {
      resolveOrders = resolve;
    }),
  );
  let effect: React.EffectCallback | undefined;
  jest.mocked(React.useEffect).mockImplementationOnce((callback) => {
    effect = callback;
  });
  let call = 0;
  jest
    .mocked(React.useState)
    .mockImplementation(() => [call++ === 0 ? 0 : null, writeResult] as never);
  AccountOrders({ locale: "en", selectedOrder: "" });
  const cleanup = effect?.();
  if (typeof cleanup === "function") cleanup();
  resolveOrders([order]);
  await Promise.resolve();
  expect(writeResult).not.toHaveBeenCalled();
});
