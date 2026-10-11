import {
  planWellnessCategories,
  wellnessCategories,
} from "../wellness-categories";
describe("wellness catalog reconciliation", () => {
  it("plans all five parents and 33 children", () => {
    const plans = planWellnessCategories([]);
    expect(plans.filter((p) => !p.parentHandle)).toHaveLength(5);
    expect(plans.filter((p) => p.parentHandle)).toHaveLength(33);
  });
  it("reuses IDs without touching unrelated categories", () => {
    const existing = wellnessCategories.map((p, i) => ({
      ...p,
      id: `pcat_${i}`,
      parent_category_id: p.parentHandle
        ? `pcat_${wellnessCategories.findIndex((c) => c.handle === p.parentHandle)}`
        : null,
    }));
    expect(
      planWellnessCategories([
        ...existing,
        { id: "unrelated", name: "Other", handle: "other" },
      ]).map((p) => p.id),
    ).toEqual(existing.map((p) => p.id));
  });
  it("refuses duplicate names and conflicting parents", () => {
    expect(() =>
      planWellnessCategories([
        { id: "1", name: "Vitamin C", handle: "a" },
        { id: "2", name: "Vitamin C", handle: "b" },
      ]),
    ).toThrow("Ambiguous");
    expect(() =>
      planWellnessCategories([
        {
          id: "1",
          name: "Vitamins & Minerals",
          handle: "vitamins-minerals",
          parent_category_id: "other",
        },
      ]),
    ).toThrow("Conflicting parent");
  });
});
