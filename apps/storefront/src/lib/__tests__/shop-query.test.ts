import {
  parseShopQuery,
  searchQuery,
  shopHref,
  updateShopQuery,
} from "../shop-query";
import { categoryHref } from "../category-tree";

it("uses readable handles, encodes path segments and retains ID compatibility", () => {
  expect(categoryHref("pcat_1", "vitamin-c")).toBe("/shop/vitamin-c");
  expect(categoryHref("pcat_1", "a/b")).toBe("/shop/a%2Fb");
  expect(categoryHref("pcat_1")).toBe("/shop?category_id=pcat_1");
});
it("parses bounded server pagination and repeated brand IDs without translating them", () => {
  expect(
    parseShopQuery({
      page: "6",
      q: "  بروتين  ",
      brand_id: ["brand_a", "brand_b", "brand_a"],
    }),
  ).toMatchObject({
    page: 6,
    q: "بروتين",
    brandIds: ["brand_a", "brand_b"],
    invalid: false,
  });
});
it.each([
  { page: "0" },
  { page: "-1" },
  { page: "1.5" },
  { page: "Infinity" },
  { page: "9007199254740992" },
  { page: ["1", "2"] },
  { q: ["x", "y"] },
  { q: "x".repeat(201) },
  { category_id: ["a", "b"] },
  { category_id: "" },
  { brand_id: "a,b" },
  { brand_id: Array.from({ length: 51 }, (_, i) => "brand_" + i) },
  { diet: "vegan" },
  { goal: "muscle" },
])("rejects malformed or unsupported filter input: %j", (values) => {
  expect(parseShopQuery(values).invalid).toBe(true);
});
it("resets the page when editing filters and retains unrelated repeated query values", () => {
  const next = updateShopQuery(
    "page=9&q=protein&brand_id=brand_a&utm=x&utm=y",
    { brand_id: ["brand_b", "brand_c"] },
  );
  expect(next.getAll("brand_id")).toEqual(["brand_b", "brand_c"]);
  expect(next.getAll("utm")).toEqual(["x", "y"]);
  expect(next.get("q")).toBe("protein");
  expect(next.has("page")).toBe(false);
  expect(shopHref("whey", next)).toBe(
    "/shop/whey?q=protein&utm=x&utm=y&brand_id=brand_b&brand_id=brand_c",
  );
  expect(updateShopQuery(next, { page: "6" }).get("page")).toBe("6");
});
it("preserves query parameters and values when resolving old links", () => {
  expect(
    searchQuery({
      q: "a & b",
      utm: ["one", "two"],
      absent: undefined,
    }).toString(),
  ).toBe("q=a+%26+b&utm=one&utm=two");
});
