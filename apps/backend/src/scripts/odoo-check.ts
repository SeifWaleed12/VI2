import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { ODOO_MODULE } from "../modules/odoo"
import type OdooModuleService from "../modules/odoo/service"

// Proves the Odoo settings work: signs in and looks up the given SKUs.
// npx medusa exec ./src/scripts/odoo-check.ts <sku> [<sku> ...]
export default async function odooCheck({ container, args }: ExecArgs) {
  if (!args.length) throw new MedusaError(MedusaError.Types.INVALID_DATA, "Supply at least one SKU to look up.")
  if (!container.hasRegistration(ODOO_MODULE)) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Odoo is not configured: set ODOO_URL, ODOO_DB, ODOO_LOGIN and ODOO_API_KEY in apps/backend/.env.")
  }
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const products = await container.resolve<OdooModuleService>(ODOO_MODULE).findProductsBySku(args)
  const found = new Set(products.map((product) => product.sku))
  for (const product of products) logger.info(`Odoo product ${product.id}: SKU ${product.sku}, barcode ${product.barcode ?? "none"}`)
  for (const sku of args.filter((sku) => !found.has(sku))) logger.warn(`No active Odoo product has SKU ${sku}`)
}
