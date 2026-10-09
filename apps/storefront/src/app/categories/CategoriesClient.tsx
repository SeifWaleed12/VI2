"use client"

import Link from "next/link"
import { ArrowRight, Search } from "lucide-react"
import { useMemo, useState } from "react"
import { categoryLinks, filterCategoryTree } from "@/lib/category-navigation"
import { useCategories } from "@/providers/category-provider"
import { useLanguage } from "@/context/LanguageContext"
import CategoryStatus from "@/components/category-status"
import styles from "./Categories.module.css"

export default function CategoriesClient() {
  const [query, setQuery] = useState("")
  const { categories, status } = useCategories()
  const { isArabic, t } = useLanguage()
  const groups = useMemo(() => filterCategoryTree(categories, query), [categories, query])

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <span>{isArabic ? "دليل فئات VI2" : "VI2 COMPLETE CATALOG"}</span>
        <h1>{isArabic ? "اكتشف ما يناسبك." : <>FIND YOUR<br />ROUTINE.</>}</h1>
        <p>{isArabic ? "اكتشف المنتجات حسب فئات المتجر." : "Explore products by store category."}</p>
        <label className={styles.search}>
          <Search size={18} strokeWidth={1.4} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={isArabic ? "ابحث في الفئات…" : "Search categories…"}
            aria-label={isArabic ? "ابحث في الفئات" : "Search categories"}
          />
        </label>
      </section>
      <section className={styles.directory}>
        <header className={styles.sectionHead}>
          <span>01</span>
          <div>
            <small>{isArabic ? "تسوق حسب الفئة" : "SHOP BY CATEGORY"}</small>
            <h2>{isArabic ? "فئات المنتجات" : "PRODUCT CATEGORIES"}</h2>
          </div>
        </header>
        <CategoryStatus />
        {status === "ready" && categories.length > 0 && groups.length === 0 && (
          <p role="status">{isArabic ? "لا توجد فئات تطابق بحثك." : "No categories match your search."}</p>
        )}
        <div className={styles.groupGrid}>
          {groups.map((group) => (
            <article key={group.id} className={styles.group}>
              <div className={styles.groupIntro}>
                <h3>{t(group.name)}</h3>
                {group.description && <p>{group.description}</p>}
              </div>
              <div className={styles.items}>
                {categoryLinks(group).map((item) => (
                  <Link key={item.id} href={item.href}>
                    <span>{t(item.label)}</span>
                    <ArrowRight size={14} strokeWidth={1.4} />
                  </Link>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
