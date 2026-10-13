import {
  buildCategoryTree,
  categoryScope,
  flattenCategories,
} from "../category-tree";
const data = [
  {
    id: "root",
    name: "Arabic or renamed parent",
    handle: "parent",
    parent_category_id: null,
    rank: 1,
  },
  {
    id: "child",
    name: "Child",
    handle: "child",
    parent_category_id: "root",
    rank: 2,
  },
  {
    id: "grandchild",
    name: "Grandchild",
    handle: "grandchild",
    parent_category_id: "child",
    rank: 0,
  },
  {
    id: "first",
    name: "Empty parent",
    handle: "first",
    parent_category_id: null,
    rank: 0,
  },
];
describe("public category tree", () => {
  it("orders by Medusa rank and keeps empty categories", () => {
    expect(buildCategoryTree(data).map((c) => c.id)).toEqual(["first", "root"]);
  });
  it("scopes by IDs through all descendants, independent of labels", () => {
    const tree = buildCategoryTree(data);
    expect(categoryScope(tree, "root")).toEqual([
      "root",
      "child",
      "grandchild",
    ]);
    expect(categoryScope(tree, "unknown")).toBeNull();
    expect(flattenCategories(tree)).toHaveLength(4);
  });
  it("does not promote children of inaccessible parents", () => {
    expect(
      buildCategoryTree([{ ...data[1], parent_category_id: "hidden" }]),
    ).toEqual([]);
  });
  it("rejects cyclic hierarchies", () => {
    expect(() =>
      buildCategoryTree([{ ...data[0], parent_category_id: "child" }, data[1]]),
    ).toThrow();
  });
});
