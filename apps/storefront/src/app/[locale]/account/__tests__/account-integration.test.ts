import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import GovernorateSelect from "../GovernorateSelect";
import AccountPoints from "../AccountPoints";
import AccountDashboard from "../AccountDashboard";

jest.mock("../Account.module.css", () => ({}));
jest.mock("@/components/LocaleLink", () => ({
  __esModule: true,
  default: ({ children, ...props }: { children: never }) => jest.requireActual("react").createElement("a", props, children),
}));
let mockAuth = { customer: null as null | { id: string; firstName: string; email: string }, isAuthenticated: false, isLoading: false };
jest.mock("@/context/AuthContext", () => ({ useAuth: () => mockAuth }));

const select = (value: string, locale: "en" | "ar") =>
  renderToStaticMarkup(createElement(GovernorateSelect, { locale, value, placeholder: "Choose" }));

it("keeps a saved city that is not in the list, instead of switching it to Cairo (AI-1)", () => {
  const html = select("الجيزة", "ar");
  expect(html).toContain('<option value="الجيزة" selected="">الجيزة</option>');
  expect(html).not.toContain('value="Cairo" selected');
  expect(select("Giza", "en")).toContain('<option value="Giza" selected="">Giza</option>');
});

it("shows governorates in Arabic on the Arabic page, saving the same values (AI-2)", () => {
  const html = select("", "ar");
  expect(html).toContain('<option value="Cairo">القاهرة</option>');
  expect(html).toContain('<option value="Port Said">بورسعيد</option>');
  expect(select("", "en")).toContain('<option value="Cairo">Cairo</option>');
});

it("does not show points loading forever to a signed-out visitor (AI-3)", () => {
  mockAuth = { customer: null, isAuthenticated: false, isLoading: false };
  expect(renderToStaticMarkup(createElement(AccountPoints, { locale: "en" }))).toBe("");
  const dashboard = renderToStaticMarkup(createElement(AccountDashboard, { locale: "en" }));
  expect(dashboard).not.toContain("Loading your points");
  expect(dashboard).toContain("View your points and their history.");
  // While sign-in is still being checked, it is loading.
  mockAuth = { customer: null, isAuthenticated: false, isLoading: true };
  expect(renderToStaticMarkup(createElement(AccountPoints, { locale: "en" }))).toContain("Loading your points");
});
