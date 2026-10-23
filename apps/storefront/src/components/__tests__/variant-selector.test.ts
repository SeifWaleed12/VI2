import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import VariantSelector from "../VariantSelector";

jest.mock("../VariantSelector.module.css", () => ({ __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) }));
it("uses native grouped radios and marks availability for the complete selection", () => {
  const html = renderToStaticMarkup(createElement(VariantSelector, {
    options: [{ id: "size", title: "Size", values: ["S", "M"] }],
    selectedOptions: { Size: "S", Flavor: "Vanilla" },
    variants: [
      { id: "s", title: "S", options: { Size: "S", Flavor: "Vanilla" }, price: 100, stock: 1, inStock: true },
      { id: "m", title: "M", options: { Size: "M", Flavor: "Chocolate" }, price: 200, stock: 1, inStock: true },
    ],
    onSelectOption: jest.fn(),
  }));
  expect(html).toContain("<fieldset");
  expect(html).toContain("<legend");
  expect(html.match(/type="radio"/g)).toHaveLength(2);
  expect(html.match(/checked=""/g)).toHaveLength(1);
  expect(html).toContain('aria-label="M (Not available with this selection)"');
  const names = [...html.matchAll(/name="([^"]+)"/g)].map((match) => match[1]);
  expect(new Set(names).size).toBe(1);
  expect(html).not.toContain("tabindex");
});
