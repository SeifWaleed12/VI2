"use client"

import { useEffect, useRef, useState } from "react"
import { useCart } from "@/context/CartContext"
import type { Product } from "@/types/product"

export function useCartAdd(product: Product) {
  const { addItem } = useCart()
  const [pending, setPending] = useState(false)
  const [added, setAdded] = useState(false)
  const [failed, setFailed] = useState(false)
  const inFlight = useRef(false)
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current)
  }, [])

  async function handleAdd() {
    if (inFlight.current) return
    inFlight.current = true
    if (resetTimer.current) clearTimeout(resetTimer.current)
    setPending(true)
    setAdded(false)
    setFailed(false)
    try {
      const success = await addItem(product)
      setAdded(success === true)
      setFailed(success !== true)
      if (success) resetTimer.current = setTimeout(() => setAdded(false), 1100)
    } catch {
      setFailed(true)
    } finally {
      inFlight.current = false
      setPending(false)
    }
  }

  return { pending, added, failed, handleAdd }
}
