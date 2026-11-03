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

it("shows a field's rule and its error under it, and marks the field invalid", async () => {
  const { AccountField } = await import("../AccountField");
  const phone = (error?: "invalidPhone" | "phoneRequired") => AccountField({
    name: "phone", label: "phone", locale: "en", error, hint: "phoneHint",
    children: (props) => createElement("input", props),
  });
  // Two phone fields on one page, as with the profile and address editors open.
  const html = renderToStaticMarkup(createElement(function Page() { return createElement("div", null, phone("invalidPhone"), phone("phoneRequired")); }));
  const ids = [...html.matchAll(/<input id="([^"]+)"[^>]*aria-describedby="([^"]+)"/g)].map(([, id, describedBy]) => ({ id, describedBy }));
  expect(ids).toHaveLength(2);
  expect(ids[0].id).not.toBe(ids[1].id);
  for (const { id, describedBy } of ids) {
    expect(html).toContain(`<label for="${id}">`);
    expect(describedBy).toBe(`${id}-hint ${id}-error`);
  }
  expect(html).toContain('aria-invalid="true"');
  expect(html).toContain("11 digits starting with 010, 011, 012 or 015");
  expect(html).toContain("This isn’t an Egyptian mobile number.");
});
