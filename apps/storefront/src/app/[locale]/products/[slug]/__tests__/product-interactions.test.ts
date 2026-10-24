import { isValidElement, type ReactElement, type ReactNode } from "react";
import ProductDetailClient from "../ProductDetailClient";
import VariantSelector from "@/components/VariantSelector";
import type { Product } from "@/types/product";

const states: unknown[] = [];
const refs: { current: unknown }[] = [];
let stateIndex = 0;
let refIndex = 0;
const addItem = jest.fn();
const push = jest.fn();
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useMemo: (fn: () => unknown) => fn(),
  useEffect: () => undefined,
  useRef: (initial: unknown) => refs[refIndex++] ?? (refs[refIndex - 1] = { current: initial }),
  useState: (initial: unknown) => {
    const index = stateIndex++;
    if (!(index in states)) states[index] = typeof initial === "function" ? initial() : initial;
    return [states[index], (next: unknown) => { states[index] = typeof next === "function" ? next(states[index]) : next; }];
  },
}));
jest.mock("../ProductDetail.module.css", () => ({ __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) }));
jest.mock("@/components/CatalogImage", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/VariantSelector", () => ({ __esModule: true, default: () => null }));
jest.mock("lucide-react", () => new Proxy({}, { get: () => () => null }));
jest.mock("@/components/LocaleLink", () => ({ __esModule: true, default: () => null }));
jest.mock("@/context/CartContext", () => ({ useCart: () => ({ addItem }) }));
jest.mock("@/context/LanguageContext", () => ({ useLanguage: () => ({ language: "en" }) }));
jest.mock("@/hooks/use-locale-router", () => ({ useLocaleRouter: () => ({ push }) }));

type Props = { children?: ReactNode; className?: string; disabled?: boolean; onClick?: () => unknown; onSelectOption?: (title: string, value: string) => void; "aria-label"?: string; role?: string };
function elements(node: ReactNode): ReactElement<Props>[] {
  if (!isValidElement<Props>(node)) return [];
  const children = node.props.children;
  return [node, ...(Array.isArray(children) ? children.flatMap(elements) : elements(children))];
}
const product: Product = {
  id: "p", slug: "p", name: "Protein", shortName: "Protein", brand: "", category: "", description: "",
  price: 300, compareAtPrice: 500, stock: 5, inStock: true, image: "", rating: 0, reviewCount: 0,
  options: [
    { id: "s", title: "Size", values: ["S", "M"] },
    { id: "f", title: "Flavor", values: ["Vanilla", "Chocolate"] },
  ],
  variants: [
    { id: "small", title: "S / Vanilla", options: { Size: "S", Flavor: "Vanilla" }, price: 100, stock: 5, inStock: true },
    { id: "medium", title: "M / Chocolate", options: { Size: "M", Flavor: "Chocolate" }, price: 150, stock: 4, inStock: true },
  ],
};
const render = () => {
  stateIndex = 0; refIndex = 0;
  return elements(ProductDetailClient({ product, similar: [] }));
};
const byClass = (tree: ReactElement<Props>[], className: string) => tree.find((element) => element.props.className === className)!;
const select = (tree: ReactElement<Props>[], title: string, value: string) => tree.find((element) => element.type === VariantSelector)!.props.onSelectOption!(title, value);
beforeEach(() => { states.length = 0; refs.length = 0; jest.clearAllMocks(); jest.useFakeTimers(); });
afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });

it("never submits an impossible combination, and sends the exact valid variant and quantity", async () => {
  let tree = render();
  select(tree, "Size", "M");
  tree = render();
  expect(byClass(tree, "addButton").props.disabled).toBe(true);
  expect(byClass(tree, "buyNow").props.disabled).toBe(true);
  await byClass(tree, "addButton").props.onClick!();
  byClass(tree, "buyNow").props.onClick!();
  expect(addItem).not.toHaveBeenCalled();
  expect(push).not.toHaveBeenCalled();

  select(tree, "Flavor", "Chocolate");
  tree = render();
  tree.find((element) => element.props["aria-label"] === "Increase quantity")!.props.onClick!();
  tree = render();
  addItem.mockResolvedValueOnce(true);
  await byClass(tree, "addButton").props.onClick!();
  expect(addItem).toHaveBeenCalledWith(expect.objectContaining({ variantId: "medium", price: 150, compareAtPrice: undefined }), 2);
  // Buy now adds the same variant to the cart without opening the drawer, then opens checkout.
  addItem.mockResolvedValueOnce(true);
  await byClass(render(), "buyNow").props.onClick!();
  expect(addItem).toHaveBeenLastCalledWith(expect.objectContaining({ variantId: "medium", price: 150 }), 2, { quiet: true });
  expect(push).toHaveBeenCalledWith("/checkout");
});
it("guards repeated cart activation while the native cart request is pending", async () => {
  let resolve!: (value: boolean) => void;
  addItem.mockReturnValue(new Promise<boolean>((done) => { resolve = done; }));
  const button = byClass(render(), "addButton");
  const pending = button.props.onClick!();
  await button.props.onClick!();
  expect(addItem).toHaveBeenCalledTimes(1);
  expect(byClass(render(), "addButton").props.disabled).toBe(true);
  resolve(false);
  await pending;
  expect(byClass(render(), "addButton").props.disabled).toBe(false);
});

it("uses Add to cart in the mobile bar with the selected quantity and reports failure there", async () => {
  let tree = render();
  select(tree, "Size", "M");
  select(render(), "Flavor", "Chocolate");
  tree = render();
  tree.find((element) => element.props["aria-label"] === "Increase quantity")!.props.onClick!();
  tree = render();
  const mobile = byClass(tree, "mobileBar");
  const button = elements(mobile).find((element) => element.type === "button")!;
  expect(button.props.children).toBe("Add to cart");
  addItem.mockResolvedValueOnce(false);
  await button.props.onClick!();
  expect(addItem).toHaveBeenCalledWith(expect.objectContaining({ variantId: "medium", price: 150 }), 2);
  expect(push).not.toHaveBeenCalled();
  const summary = byClass(render(), "mobileSummary");
  expect(JSON.stringify(summary.props.children)).toContain("M · Chocolate · Quantity: 2");
  expect(JSON.stringify(summary.props.children)).toContain("300 EGP");
  expect(byClass(render(), "mobileError").props.children).toContain("Could not add to cart");
  expect(byClass(render(), "mobileError").props.role).toBe("alert");
});

it("never overrides an explicit sold-out selection with the preferred purchasable variant", async () => {
  const first = product.variants![0];
  const wasInStock = first.inStock;
  first.inStock = false;
  try {
    let tree = render();
    select(tree, "Size", "S");
    select(render(), "Flavor", "Vanilla");
    tree = render();
    expect(byClass(tree, "addButton").props.disabled).toBe(true);
    expect(byClass(tree, "buyNow").props.disabled).toBe(true);
    await byClass(tree, "addButton").props.onClick!();
    expect(addItem).not.toHaveBeenCalled();
    expect(JSON.stringify(byClass(tree, "priceRow").props.children)).toContain("100 EGP");
  } finally {
    first.inStock = wasInStock;
  }
});
