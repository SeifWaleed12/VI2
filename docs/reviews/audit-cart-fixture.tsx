import React, { useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import { CartProvider, useCart } from "../../apps/storefront/src/providers/cart-provider"
import { controls } from "fixture:cart"

localStorage.clear()
localStorage.setItem("vi2-medusa-cart-id", "cart_initial")
const product = { id: "prod_2", variantId: "variant_2", slug: "second", name: "Second", price: 80 }
function Panel() {
  const cart = useCart()
  const [, changed] = useState(0)
  useEffect(() => {
    const listener = () => changed(n => n + 1)
    window.addEventListener("fixture-changed", listener)
    return () => window.removeEventListener("fixture-changed", listener)
  }, [])
  const buttons = {
    "Clear cart": () => cart.clearCart(), "Release load": controls.releaseLoad,
    "Refresh new cart": () => cart.refreshCart(), "Change base quantity": () => cart.updateQuantity("line_1", 2),
    "Apply promotion": () => cart.applyPromotion("SAVE"), "Release quantity": controls.releaseQuantity,
    "Add delayed item": () => cart.addItem(product as never), "Change pending item quantity": () => cart.updateQuantity("prod_2", 3),
    "Release add": controls.releaseAdd,
  }
  return <main><h1>Controlled cart regression fixture</h1>
    {Object.entries(buttons).map(([name, action]) => <button key={name} onClick={() => void action()}>{name}</button>)}
    <pre id="snapshot">{JSON.stringify({ cartId: cart.cartId, email: cart.cart?.email ?? null, total: cart.total,
      items: cart.items.map(item => ({ id: item.id ?? null, variant: item.product.variantId, quantity: item.quantity })),
      stored: localStorage.getItem("vi2-medusa-cart-id"), error: cart.error, calls: controls.calls }, null, 2)}</pre>
  </main>
}
createRoot(document.getElementById("root")!).render(<CartProvider><Panel /></CartProvider>)
