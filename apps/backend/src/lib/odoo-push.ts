import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import { ODOO_MODULE } from "../modules/odoo"
import type OdooModuleService from "../modules/odoo/service"
import { isCashOnDelivery, odooContactLockKey, odooOrderLines, type WebsiteOrder } from "./odoo-orders"

// Seconds. A push waits for another push of the same order or email; the lock
// expires on its own only if a process dies holding it. Each Odoo call times
// out after 10 s.
const LOCK = { timeout: 30, expire: 120 }

// Medusa computes order totals from the items and shipping methods it loads,
// so all their fields are loaded.
const ORDER_FIELDS = [
  "id", "email", "status", "metadata", "original_shipping_total", "discount_total",
  "items.*", "shipping_methods.*", "payment_collections.payments.provider_id",
  "shipping_address.first_name", "shipping_address.last_name", "shipping_address.phone",
  "shipping_address.address_1", "shipping_address.address_2", "shipping_address.city", "shipping_address.postal_code", "shipping_address.country_code",
]

type Person = { email: string, first_name?: string | null, last_name?: string | null, phone?: string | null }
type MedusaAddress = { address_1?: string | null, address_2?: string | null, city?: string | null, postal_code?: string | null, country_code?: string | null }

// The Odoo contact and website lead for one email (plan F1, D8), and the
// delivery address when there is one, under the lock the customer and order
// pushes share, so they never both create.
async function pushContact(container: MedusaContainer, odoo: OdooModuleService, person: Person, shipTo?: MedusaAddress | null) {
  const name = [person.first_name, person.last_name].filter(Boolean).join(" ").trim() || person.email
  const address = shipTo ? { street: shipTo.address_1, street2: shipTo.address_2, city: shipTo.city, zip: shipTo.postal_code, countryCode: shipTo.country_code } : undefined
  return container.resolve(Modules.LOCKING).execute(odooContactLockKey(person.email), async () => {
    const contact = await odoo.upsertContact({ email: person.email, name, phone: person.phone, address })
    if (contact.duplicates.length) {
      container.resolve(ContainerRegistrationKeys.LOGGER).warn(`Odoo has several contacts with one website email; using ${contact.id}, not ${contact.duplicates.join(", ")}.`)
    }
    return {
      partnerId: contact.id,
      leadId: await odoo.upsertLead(contact.id, name),
      deliveryId: address ? await odoo.upsertDeliveryAddress(contact.id, { name, phone: person.phone, address }) : undefined,
    }
  }, LOCK)
}

// A registered customer becomes an Odoo contact and lead; their ids go in the
// customer's metadata. Guests reach Odoo with their order. Running it again
// changes nothing in Odoo.
export async function pushCustomerToOdoo(container: MedusaContainer, customerId: string) {
  if (!container.hasRegistration(ODOO_MODULE)) return
  const customers = container.resolve(Modules.CUSTOMER)
  const customer = await customers.retrieveCustomer(customerId)
  if (!customer.has_account) return
  const { partnerId, leadId } = await pushContact(container, container.resolve<OdooModuleService>(ODOO_MODULE), customer)
  await customers.updateCustomers(customer.id, { metadata: { ...customer.metadata, odoo_partner_id: partnerId, odoo_crm_lead_id: leadId } })
}

// The order becomes an Odoo sales order (client_order_ref = Medusa order id)
// with its contact and lead; cash on delivery is confirmed at once, a card
// order stays a quotation until it is paid (plan D5). The Odoo ids go in the
// order's metadata. Running it again changes nothing in Odoo.
export async function pushOrderToOdoo(container: MedusaContainer, orderId: string) {
  if (!container.hasRegistration(ODOO_MODULE)) return
  const odoo = container.resolve<OdooModuleService>(ODOO_MODULE)
  await container.resolve(Modules.LOCKING).execute(`odoo-order:${orderId}`, async () => {
    const { data: [order] } = await container.resolve(ContainerRegistrationKeys.QUERY).graph({ entity: "order", fields: ORDER_FIELDS, filters: { id: orderId } })
    if (!order) throw new MedusaError(MedusaError.Types.NOT_FOUND, `Order ${orderId} not found.`)
    if (order.status === "canceled") return
    const lines = odooOrderLines(order as unknown as WebsiteOrder)
    const { partnerId, leadId, deliveryId } = await pushContact(container, odoo, { ...order.shipping_address, email: order.email as string }, order.shipping_address)
    const sale = await odoo.upsertSaleOrder(order.id, partnerId, lines, deliveryId)
    if (isCashOnDelivery(order as unknown as WebsiteOrder) && ["draft", "sent"].includes(sale.state)) await odoo.confirmSaleOrder(sale.id)
    await container.resolve(Modules.ORDER).updateOrders(order.id, { metadata: { ...order.metadata, odoo_sale_order_id: sale.id, odoo_crm_lead_id: leadId } })
  }, LOCK)
}
