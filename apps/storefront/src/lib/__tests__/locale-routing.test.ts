import { NextRequest } from "next/server";
import { proxy } from "../../proxy";
import { localizedHref, message } from "../i18n";
describe("locale routing", () => {
  it("preserves query and fragments when switching languages", () => {
    expect(localizedHref("/en/shop?category_id=pcat_1#results", "ar")).toBe(
      "/ar/shop?category_id=pcat_1#results",
    );
    expect(localizedHref("/api/auth/me", "ar")).toBe("/api/auth/me");
    expect(localizedHref("https://example.com", "ar")).toBe(
      "https://example.com",
    );
    expect(localizedHref("//example.com", "ar")).toBe("//example.com");
  });
  it("redirects legacy pages with a saved preference and keeps their query", () => {
    const result = proxy(
      new NextRequest("http://localhost/shop?category_id=pcat_1", {
        headers: { cookie: "vi2-language=ar" },
      }),
    );
    expect(result.headers.get("location")).toBe(
      "http://localhost/ar/shop?category_id=pcat_1",
    );
    expect(
      proxy(new NextRequest("http://localhost/")).headers.get("location"),
    ).toBe("http://localhost/en");
  });
  it.each([
    "/categories",
    "/categories/",
    "/en/categories",
    "/ar/categories",
    "/ar/categories/old",
  ])("returns 404 without redirect for %s", (path) => {
    const result = proxy(new NextRequest(`http://localhost${path}`));
    expect(result.status).toBe(404);
    expect(result.headers.get("location")).toBeNull();
  });
  it("uses each request's URL locale rather than a shared or spoofed header", () => {
    const ar = proxy(
      new NextRequest("http://localhost/ar/shop", {
        headers: { "x-vi2-locale": "en" },
      }),
    );
    const en = proxy(
      new NextRequest("http://localhost/en/shop", {
        headers: { "x-vi2-locale": "ar" },
      }),
    );
    expect(ar.headers.get("x-middleware-request-x-vi2-locale")).toBe("ar");
    expect(en.headers.get("x-middleware-request-x-vi2-locale")).toBe("en");
    expect(message("ar", "nav.categories")).toBe("الأقسام");
  });
});
