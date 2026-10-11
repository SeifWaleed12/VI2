import { NextRequest } from "next/server";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { config, proxy } from "../../proxy";
import { localizedHref, message } from "../i18n";
describe("locale routing", () => {
  it.each([
    "/products/whey-2.5kg",
    "/en/products/whey-2.5kg",
    "/ar/products/whey-2.5kg",
  ])("runs language routing for dotted product handle %s", (url) => {
    expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url })).toBe(true);
    const result = proxy(new NextRequest(`http://localhost${url}`));
    if (url.startsWith("/products/")) {
      expect(result.headers.get("location")).toBe(
        "http://localhost/en/products/whey-2.5kg",
      );
    } else {
      expect(result.headers.get("x-middleware-request-x-vi2-locale")).toBe(
        url.split("/")[1],
      );
    }
  });
  it.each([
    "/api/auth/me",
    "/_next/static/chunk.js",
    "/products/whey.svg",
    "/brand/logo.png",
    "/fonts/body.woff2",
    "/robots.txt",
    "/sitemap.xml",
  ])("keeps APIs and static files unprefixed: %s", (url) => {
    expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url })).toBe(
      false,
    );
  });
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
