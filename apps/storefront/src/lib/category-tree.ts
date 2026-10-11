export type Category = {
  id: string;
  name: string;
  handle: string;
  parent_category_id: string | null;
  rank?: number;
  children: Category[];
};
export function buildCategoryTree(categories: Omit<Category, "children">[]) {
  const nodes = new Map(
    categories.map((c) => [c.id, { ...c, children: [] as Category[] }]),
  );
  const roots: Category[] = [];
  for (const node of nodes.values()) {
    if (node.parent_category_id) {
      const parent = nodes.get(node.parent_category_id);
      if (!parent) continue; // An inaccessible parent must not expose its child as a new public root.
      parent.children.push(node);
    } else roots.push(node);
  }
  const visited = new Set<string>();
  function order(items: Category[]) {
    items.sort(
      (a, b) => (a.rank ?? 0) - (b.rank ?? 0) || a.id.localeCompare(b.id),
    );
    for (const item of items) {
      if (visited.has(item.id)) throw new Error("Invalid category hierarchy");
      visited.add(item.id);
      order(item.children);
    }
  }
  order(roots);
  if (
    visited.size !== nodes.size &&
    categories.every(
      (c) => !c.parent_category_id || nodes.has(c.parent_category_id),
    )
  )
    throw new Error("Invalid category hierarchy");
  return roots;
}
export function flattenCategories(roots: Category[]): Category[] {
  return roots.flatMap((c) => [c, ...flattenCategories(c.children)]);
}
export function categoryScope(roots: Category[], id: string) {
  const category = flattenCategories(roots).find((c) => c.id === id);
  return category ? flattenCategories([category]).map((c) => c.id) : null;
}
export function categoryHref(id: string) {
  return `/shop?category_id=${encodeURIComponent(id)}`;
}
export type CategoryDirectory = { roots: Category[]; error: boolean };
