import { Suspense } from "react"
import { notFound } from "next/navigation"
import { getProducts, getCategoryDirectory } from "@/lib/medusa"
import { buildCategoryTree, categoryLinks, findCategory } from "@/lib/category-navigation"
import ShopClient from "./ShopClient"

export default async function ShopPage({ searchParams }: {
  searchParams: Promise<{ category_id?: string | string[]; category?: string | string[] }>
}) {
  const query = await searchParams
  const categoryId = query.category_id
  if (categoryId !== undefined && (typeof categoryId !== "string" || !categoryId)) notFound()
  const legacyName = categoryId === undefined ? query.category : undefined
  if (legacyName !== undefined && (typeof legacyName !== "string" || !legacyName)) notFound()
  const scoped = categoryId !== undefined || legacyName !== undefined
  const categories = await getCategoryDirectory().catch((error) => {
    if (scoped) throw error
    return []
  })
  const legacyMatches = legacyName ? categories.filter((category) => category.name === legacyName) : []
  if (legacyName && legacyMatches.length !== 1) notFound()
  const selectedId = categoryId ?? legacyMatches[0]?.id
  const selected = selectedId ? findCategory(buildCategoryTree(categories), selectedId) : undefined
  if (selectedId && !selected) notFound()
  const products = await getProducts(selected ? {
    category_id: categoryLinks(selected).map((category) => category.id),
  } : {})

  return (
    <Suspense fallback={<ShopLoading />}>
      <ShopClient
        key={selectedId ?? "all"}
        products={products}
        categoryOptions={categories}
        selectedCategoryId={selected?.id}
        selectedCategoryName={selected?.name}
      />
    </Suspense>
  )
}

function ShopLoading() {
  return (
    <main style={{ minHeight: "70vh", display: "grid", placeItems: "center", background: "#fbfaf7" }}>
      <span style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.14em" }}>LOADING VI2</span>
    </main>
  )
}
