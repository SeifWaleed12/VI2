import type { StoreCategory } from "./medusa/services/categories"

export type CategoryNode = {
  id: string
  name: string
  description: string
  href: string
  children: CategoryNode[]
}

export function categoryHref(id: string) {
  return `/shop?${new URLSearchParams({ category_id: id })}`
}

export function buildCategoryTree(categories: StoreCategory[]): CategoryNode[] {
  const nodes = new Map(categories.map((category) => [category.id, {
    id: category.id,
    name: category.name,
    description: category.description ?? "",
    href: categoryHref(category.id),
    children: [] as CategoryNode[],
  }]))
  const roots: CategoryNode[] = []

  for (const category of categories) {
    const node = nodes.get(category.id)!
    const parent = category.parent_category_id
      ? nodes.get(category.parent_category_id)
      : undefined
    if (parent) parent.children.push(node)
    else roots.push(node)
  }

  return roots
}

export function categoryLinks(category: CategoryNode): { id: string; label: string; href: string }[] {
  return [
    { id: category.id, label: category.name, href: category.href },
    ...category.children.flatMap((child) => categoryLinks(child)),
  ]
}

export function filterCategoryTree(categories: CategoryNode[], query: string): CategoryNode[] {
  const normalized = query.trim().toLocaleLowerCase()
  if (!normalized) return categories

  return categories.flatMap((category) => {
    if (category.name.toLocaleLowerCase().includes(normalized)) return [category]
    const children = filterCategoryTree(category.children, normalized)
    return children.length ? [{ ...category, children }] : []
  })
}

export function findCategory(categories: CategoryNode[], id: string): CategoryNode | undefined {
  for (const category of categories) {
    if (category.id === id) return category
    const child = findCategory(category.children, id)
    if (child) return child
  }
}
