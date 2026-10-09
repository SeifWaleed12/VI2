"use client"

import {
  createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode,
} from "react"
import { getCategoryDirectory } from "@/lib/medusa/services/categories"
import { buildCategoryTree, type CategoryNode } from "@/lib/category-navigation"

type CategoryContextValue = {
  categories: CategoryNode[]
  status: "loading" | "ready" | "error"
  retry: () => void
}

const CategoryContext = createContext<CategoryContextValue | null>(null)

export function CategoryProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Omit<CategoryContextValue, "retry">>({
    categories: [], status: "loading",
  })
  const [attempt, setAttempt] = useState(0)
  const request = useRef<Promise<CategoryNode[]> | null>(null)

  useEffect(() => {
    let current = true
    // Reuse the in-flight request during React's development effect replay.
    request.current ??= getCategoryDirectory().then(buildCategoryTree)
    request.current.then(
      (categories) => { if (current) setState({ categories, status: "ready" }) },
      () => { if (current) setState({ categories: [], status: "error" }) },
    )
    return () => { current = false }
  }, [attempt])

  const retry = useCallback(() => {
    request.current = null
    setState({ categories: [], status: "loading" })
    setAttempt((value) => value + 1)
  }, [])

  return <CategoryContext.Provider value={{ ...state, retry }}>{children}</CategoryContext.Provider>
}

export function useCategories() {
  const context = useContext(CategoryContext)
  if (!context) throw new Error("useCategories must be used within CategoryProvider")
  return context
}
