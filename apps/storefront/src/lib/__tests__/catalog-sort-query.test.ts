import { parseShopQuery, updateShopQuery, shopHref } from "../shop-query";
import { CATALOG_SORTS } from "../catalog-sort";
it.each(CATALOG_SORTS)("accepts %s with pagination and keeps untranslated filter IDs", sort => {
  expect(parseShopQuery({ sort, page: "6", brand_id: "brand_one", goal: "immune-support", deals: "1" })).toMatchObject({
    invalid: false, sort, page: 6, brandIds: ["brand_one"], deals: true, goal: "immune-support",
  });
});
it("resets pagination on sort changes and retains filter and campaign state", () => {
  const query = updateShopQuery("page=8&brand_id=brand_a&q=زنك&deals=1&utm=x&utm=y", { sort: "price_asc" });
  expect(query.has("page")).toBe(false);
  expect(query.get("brand_id")).toBe("brand_a");
  expect(query.get("deals")).toBe("1");
  expect(query.getAll("utm")).toEqual(["x", "y"]);
  expect(shopHref("vitamins", query)).toContain("/shop/vitamins?");
});
it.each(["quantity", "rating", "random"])("rejects unsupported sorting: %s", sort => {
  expect(parseShopQuery({ sort }).invalid).toBe(true);
});
