import { Suspense } from "react"
import { notFound } from "next/navigation"
import { getProducts, getCategoryDirectory } from "@/lib/medusa"
import { buildCategoryTree, categoryLinks, findCategory } from "@/lib/category-navigation"
import ShopClient from "./ShopClient"

export default async function ShopPage({ searchParams }: {
  searchParams: Promise<{ category_id?: string | string[] }>
}) {
  const [query, categories] = await Promise.all([searchParams, getCategoryDirectory()])
  const categoryId = query.category_id
  if (categoryId !== undefined && (typeof categoryId !== "string" || !categoryId)) notFound()
  const selected = categoryId ? findCategory(buildCategoryTree(categories), categoryId) : undefined
  if (categoryId && !selected) notFound()
  const products = await getProducts(selected ? {
    category_id: categoryLinks(selected).map((category) => category.id),
  } : {})

  return (
    <Suspense fallback={<ShopLoading />}>
      <ShopClient
        key={categoryId ?? "all"}
        products={products}
        initialCategories={categories.map((category) => category.name)}
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
