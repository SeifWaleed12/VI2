import { Modules } from "@medusajs/framework/utils"
import odooOrder from "../../subscribers/odoo-order"
import { ODOO_MODULE } from "../../modules/odoo"
import { pushCustomerToOdoo, pushOrderToOdoo } from "../odoo-push"

const placed = {
  id: "order_1",
  email: "sara@example.com",
  status: "pending",
  metadata: { note: "kept" },
  items: [{ variant_sku: "WHEY", quantity: 2, unit_price: 1500 }],
  original_shipping_total: 60,
  discount_total: 0,
  payment_collections: [{ payments: [{ provider_id: "pp_system_default" }] }],
  shipping_address: { first_name: "Sara", last_name: "Ali", phone: "+201000000000" },
}

function setup({ order = placed as Record<string, unknown>, saleState = "draft", odooConfigured = true } = {}) {
  const locks: string[] = []
  const odoo = {
    upsertContact: jest.fn().mockResolvedValue({ id: 12, duplicates: [] }),
    upsertLead: jest.fn().mockResolvedValue(40),
    upsertSaleOrder: jest.fn().mockResolvedValue({ id: 90, state: saleState }),
    confirmSaleOrder: jest.fn().mockResolvedValue(undefined),
  }
  const customers = {
    retrieveCustomer: jest.fn().mockResolvedValue({ id: "cus_1", email: "sara@example.com", first_name: "Sara", last_name: null, phone: null, has_account: true, metadata: null }),
    updateCustomers: jest.fn(),
  }
  const orders = { updateOrders: jest.fn() }
  const logger = { error: jest.fn(), warn: jest.fn() }
  const services: Record<string, unknown> = {
    [ODOO_MODULE]: odoo,
    [Modules.LOCKING]: { execute: jest.fn(async (key: string, run: () => Promise<unknown>) => { locks.push(key); return run() }) },
    [Modules.CUSTOMER]: customers,
    [Modules.ORDER]: orders,
    query: { graph: jest.fn().mockResolvedValue({ data: [order] }) },
    logger,
  }
  const container = { hasRegistration: (key: string) => odooConfigured || key !== ODOO_MODULE, resolve: (key: string) => services[key] }
  return { container: container as never, odoo, customers, orders, logger, locks }
}

it("sends a cash-on-delivery order to Odoo, confirms it and stores the Odoo ids", async () => {
  const { container, odoo, orders, locks } = setup()
  await pushOrderToOdoo(container, "order_1")
  expect(locks).toEqual(["odoo-order:order_1", "odoo-contact:sara@example.com"])
  expect(odoo.upsertContact).toHaveBeenCalledWith({ email: "sara@example.com", name: "Sara Ali", phone: "+201000000000" })
  expect(odoo.upsertLead).toHaveBeenCalledWith(12, "Sara Ali")
  expect(odoo.upsertSaleOrder).toHaveBeenCalledWith("order_1", 12, [{ sku: "WHEY", quantity: 2, unitPrice: 1500 }, { sku: "WEB-SHIPPING", quantity: 1, unitPrice: 60 }])
  expect(odoo.confirmSaleOrder).toHaveBeenCalledWith(90)
  expect(orders.updateOrders).toHaveBeenCalledWith("order_1", { metadata: { note: "kept", odoo_sale_order_id: 90, odoo_crm_lead_id: 40 } })
})

it("does not confirm an order Odoo already confirmed, or one not paid in cash", async () => {
  const confirmed = setup({ saleState: "sale" })
  await pushOrderToOdoo(confirmed.container, "order_1")
  expect(confirmed.odoo.confirmSaleOrder).not.toHaveBeenCalled()

  const card = setup({ order: { ...placed, payment_collections: [{ payments: [{ provider_id: "pp_paymob_card" }] }] } })
  await pushOrderToOdoo(card.container, "order_1")
  expect(card.odoo.upsertSaleOrder).toHaveBeenCalled()
  expect(card.odoo.confirmSaleOrder).not.toHaveBeenCalled()
})

it("leaves a cancelled order out of Odoo, and does nothing without Odoo", async () => {
  const cancelled = setup({ order: { ...placed, status: "canceled" } })
  await pushOrderToOdoo(cancelled.container, "order_1")
  expect(cancelled.odoo.upsertSaleOrder).not.toHaveBeenCalled()

  const off = setup({ odooConfigured: false })
  await pushOrderToOdoo(off.container, "order_1")
  await pushCustomerToOdoo(off.container, "cus_1")
  expect(off.locks).toEqual([])
})

it("sends a registered customer to Odoo and keeps the ids; a guest waits for their order", async () => {
  const { container, odoo, customers, locks, logger } = setup()
  odoo.upsertContact.mockResolvedValue({ id: 12, duplicates: [15] })
  await pushCustomerToOdoo(container, "cus_1")
  expect(locks).toEqual(["odoo-contact:sara@example.com"])
  expect(odoo.upsertLead).toHaveBeenCalledWith(12, "Sara")
  expect(customers.updateCustomers).toHaveBeenCalledWith("cus_1", { metadata: { odoo_partner_id: 12, odoo_crm_lead_id: 40 } })
  expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("using 12, not 15"))

  const guest = setup()
  guest.customers.retrieveCustomer.mockResolvedValue({ id: "cus_2", email: "g@example.com", has_account: false })
  await pushCustomerToOdoo(guest.container, "cus_2")
  expect(guest.odoo.upsertContact).not.toHaveBeenCalled()
})

it("logs a failed order push without the customer's details and rethrows so the event bus retries", async () => {
  const { container, odoo, logger, orders } = setup()
  odoo.upsertSaleOrder.mockRejectedValue(new Error("Odoo did not answer"))
  await expect(odooOrder({ event: { name: "order.placed", data: { id: "order_1" } }, container } as never)).rejects.toThrow("Odoo did not answer")
  expect(logger.error).toHaveBeenCalledWith("Odoo push of order order_1 failed: Odoo did not answer")
  expect(orders.updateOrders).not.toHaveBeenCalled()
})
