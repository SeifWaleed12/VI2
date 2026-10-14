import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import ProductBrandLink from "../links/product-brand"
import { BRAND_MODULE } from "../modules/brand"
import type BrandModuleService from "../modules/brand/service"
import { requestPath } from "./admin-access"

const MAX_BRAND_IDS = 50
// Matches no product: Medusa then answers an empty page with count 0.
const NO_PRODUCT = "prod_none"

// Medusa's product list filters by category, search and page, but not by our
// linked brand, and refuses unknown query fields. This turns `brand_id` into
// the IDs of the active brands' products before Medusa validates the query, so
// Medusa still applies publishing, sales channel, prices and the total count.
// Registered without a method, so it runs before Medusa's own route checks.
export async function filterProductsByBrand(req: MedusaRequest, _res: MedusaResponse, next: MedusaNextFunction) {
  if (req.method !== "GET" || requestPath(req) !== "/store/products" || req.query.brand_id === undefined) return next()
  const raw = req.query.brand_id
  delete req.query.brand_id
  const brandIds = Array.isArray(raw) ? raw : [raw]
  if (!brandIds.length || brandIds.length > MAX_BRAND_IDS || !brandIds.every((id) => typeof id === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(id))) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, `brand_id must be 1 to ${MAX_BRAND_IDS} brand IDs.`)
  }

  const brands = await req.scope.resolve<BrandModuleService>(BRAND_MODULE).listBrands({ id: brandIds as string[], status: "active" }, { select: ["id"] })
  const productIds = brands.length
    ? (await req.scope.resolve(ContainerRegistrationKeys.QUERY).graph({ entity: ProductBrandLink.entryPoint, fields: ["product_id"], filters: { brand_id: brands.map((brand) => brand.id) } })).data.map((link: { product_id: string }) => link.product_id)
    : []

  // An `id` filter already in the request narrows the brand's products further.
  const requested = req.query.id === undefined ? undefined : new Set([req.query.id].flat().map(String))
  const ids = [...new Set(productIds)].filter((id) => !requested || requested.has(id))
  req.query.id = ids.length ? ids : [NO_PRODUCT]
  return next()
}
