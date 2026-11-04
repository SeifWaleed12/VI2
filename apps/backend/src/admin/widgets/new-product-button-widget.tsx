import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Button, Container, Text } from "@medusajs/ui"
import { Link } from "react-router-dom"

// Entry point to the one-form product page (src/admin/routes/products-new).
const NewProductButtonWidget = () => (
  <Container className="flex items-center justify-between px-6 py-4">
    <Text size="small" className="text-ui-fg-subtle">
      Create a product with its brand, EDA registration, images and variants in one form.
    </Text>
    <Button size="small" asChild>
      <Link to="/products-new">New product (Vi2)</Link>
    </Button>
  </Container>
)

export const config = defineWidgetConfig({
  zone: "product.list.before",
})

export default NewProductButtonWidget
