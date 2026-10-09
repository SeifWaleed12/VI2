"use client"

import { useCategories } from "@/providers/category-provider"
import { useLanguage } from "@/context/LanguageContext"

export default function CategoryStatus() {
  const { categories, status, retry } = useCategories()
  const { isArabic } = useLanguage()

  if (status === "loading") {
    return <p role="status">{isArabic ? "جارٍ تحميل الفئات…" : "Loading categories…"}</p>
  }
  if (status === "error") {
    return (
      <div role="alert">
        <p>{isArabic ? "تعذر تحميل الفئات." : "Categories are temporarily unavailable."}</p>
        <button type="button" onClick={retry}>
          {isArabic ? "حاول مرة أخرى" : "Try again"}
        </button>
      </div>
    )
  }
  if (!categories.length) {
    return <p role="status">{isArabic ? "لا توجد فئات متاحة حالياً." : "No categories are available yet."}</p>
  }
  return null
}
