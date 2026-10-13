import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import EdaModule from "../modules/eda"

// One registration per product; deleting the product removes its registration.
export default defineLink(
  ProductModule.linkable.product,
  { linkable: EdaModule.linkable.edaRegistration, deleteCascade: true }
)
