import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import BrandLogo from "../BrandLogo";

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => createElement("img", { src, alt }),
}));

it("shows the logo staff uploaded, and the brand's name when there is none", () => {
  const withLogo = renderToStaticMarkup(createElement(BrandLogo, { name: "NOW Foods", logo: "https://media.test/brand-logo-now-foods.png" }));
  expect(withLogo).toContain('src="https://media.test/brand-logo-now-foods.png"');
  expect(withLogo).toContain('alt="NOW Foods logo"');
  for (const logo of [null, undefined, ""]) {
    expect(renderToStaticMarkup(createElement(BrandLogo, { name: "NOW Foods", logo }))).toBe("<span>NOW Foods</span>");
  }
});
