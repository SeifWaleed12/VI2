import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"

// Medusa's Create button opens its form at /products/create, on top of the
// product list where this widget lives. It is sent to the one-form product page
// (src/admin/routes/products-new) instead, so there is a single create form.
const CreateProductRedirectWidget = () => {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  useEffect(() => {
    if (pathname.replace(/\/+$/, "") === "/products/create") navigate("/products-new", { replace: true })
  }, [pathname, navigate])
  return null
}

export const config = defineWidgetConfig({
  zone: "product.list.before",
})

export default CreateProductRedirectWidget
