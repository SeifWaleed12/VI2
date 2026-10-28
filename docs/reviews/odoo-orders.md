# O-3a: customers and orders to Odoo

Claude, 2026-10-28. Handoff for GPT review. No merge: Seif merges, after the O-0 live check.

## Who asked and why

Seif released the Odoo integration (RD v1.1 F1 and F2: website customers reach Odoo's CRM, confirmed website orders reach Odoo as sales orders). Plan: `docs/ODOO-INTEGRATION-PLAN.md` 2.1 (Contact lock, customer and order rows), approved by GPT. O-3 is split in two reviews; this is O-3a. O-3b (cancelling in Odoo, and the 5-minute `reconcile-odoo` job) follows.

## What to review

- Branch `claude/odoo-orders`, from `odoo` `c41d055` (O-1 and O-2, approved), which is from `full-stack` `d039f3d`.
- Review `0080a5b` only (diff `c41d055..0080a5b`).

## What was missing

Website customers and orders never reached Odoo, so staff had no CRM record of website buyers and Odoo's stock and accounting did not see website sales.

## Seif's decisions

- D5: cash on delivery is confirmed in Odoo at placement; card orders on Paymob capture (not built; they stay quotations).
- D8: every website customer, registered or guest, gets a contact tagged "Website" and a CRM lead with source "Website".
- D9: order lines carry no tax until the VAT decision.
- 2026-10-28 (this task): the shipping fee and the discount go on two Odoo service products staff create, Internal References `WEB-SHIPPING` and `WEB-DISCOUNT`, so the Odoo total equals what the customer pays. A kit goes as one line under the kit's own SKU (Odoo needs a kit product with that SKU).

## The change

- `src/modules/odoo/service.ts`:
  - `upsertContact`: `res.partner` by `email_normalized` (exact, no wildcards); lowest id wins, the others are returned as duplicates; otherwise creates one with the "Website" tag (`res.partner.category`, found or created).
  - `upsertLead`: `crm.lead` by partner and the "Website" `utm.source` (found or created), archived (lost) leads included, otherwise creates one.
  - `upsertSaleOrder`: `sale.order` by `client_order_ref` = Medusa order id; otherwise resolves every SKU to an active product (missing → `rejected`, nothing created) and creates the quotation with `price_unit` = Medusa's price and no tax.
  - `confirmSaleOrder`: `action_confirm`.
  - Private `search`, `create`, `findOrCreate`, validating ids.
- `src/lib/odoo-orders.ts` (no I/O): `odooOrderLines` (items at `unit_price`, then `WEB-SHIPPING` at `original_shipping_total`, then `WEB-DISCOUNT` at −`discount_total`; a line without a SKU throws), `isCashOnDelivery` (a payment by `pp_system_default`, the storefront's cash on delivery), `odooContactLockKey`.
- `src/lib/odoo-push.ts`:
  - `pushOrderToOdoo`: under `odoo-order:<id>`, loads the order, skips a cancelled one, builds the lines, then under `odoo-contact:<email>` the contact and lead (name and phone from the shipping address), then the sales order; confirms it if cash on delivery and still `draft`/`sent`; stores `odoo_sale_order_id` and `odoo_crm_lead_id` in the order's metadata (other keys kept).
  - `pushCustomerToOdoo`: registered customers only (`has_account`); under the contact lock; stores `odoo_partner_id` and `odoo_crm_lead_id` in the customer's metadata.
  - Both do nothing when Odoo is not configured.
- `src/subscribers/odoo-order.ts` (`order.placed`), `src/subscribers/odoo-customer.ts` (`customer.created`): log without customer details and rethrow, so the Redis event bus retries (as `order-received-email`).

Deviation from the plan's wording: the plan says "workflows"; these are plain functions under `Modules.LOCKING`, as in `sync-odoo-stock`. Odoo writes cannot be compensated, so a workflow would add steps without rollback.

## Verification

- `npm run check`: backend 392 tests (46 suites, 17 new), storefront 579, typecheck and lint clean.
- New tests: `lib/__tests__/odoo-orders.unit.spec.ts` (lines add up to Medusa's total, no empty delivery or discount line, missing SKU, cash on delivery, lock key), service tests (contact reuse and duplicates, contact and tag creation, lead lookup with lost leads and creation, existing sales order not recreated, quotation lines and no tax, missing SKU creates nothing, confirm, create without an id), `lib/__tests__/odoo-push.unit.spec.ts` (lock order, confirm only cash on delivery in draft, cancelled order skipped, Odoo off does nothing, registered vs guest customer, metadata kept, subscriber logs and rethrows).
- Tests proven to catch bugs: all code is new, so instead I broke it four ways and each broke a test: confirming an already-confirmed order, pushing guests on registration, dropping the discount line, skipping lost leads.
- Live, in the running backend on the dev database (`medusa exec`), with the real query, Redis locks and customer reads, a fake Odoo and no writes: two recent orders produced lines whose sum equals Medusa's total (600 + 70 delivery = 670; 500 + 70 = 570), were detected as cash on delivery and confirmed, and their metadata write carried the two ids; one dev order with a product lacking a SKU was refused with the SKU error; a registered customer produced contact, lead and the metadata write. Nothing was written; no test data created.

Not checked:
- A real Odoo (O-0): field names, `email_normalized`, `action_confirm`, and whether Odoo keeps the given `price_unit`.
- An order with a discount in the live run (the dev orders had none; the unit test covers it).
- `customer.created` firing from the real registration route (the subscriber was not triggered live).

## Known limits

- `shortcut:` the line tax field is `tax_id` up to Odoo 18 and `tax_ids` from 19; set it when D1 is answered.
- `shortcut:` two first-ever pushes at the same moment can create two "Website" tags or sources.
- A failing push retries 5 times over about 2-3 minutes, then waits for O-3b's reconcile job. An order with a SKU Odoo lacks fails every retry; it is logged by order id.
- Odoo's error messages go to the server log as they are.

## Things to look at

1. Is `email_normalized` the right exact-match key, and is the lowest-id rule safe for contacts staff made by hand?
2. Lock order (order, then contact) and the 30 s wait / 120 s expiry against Odoo's 10 s per call.
3. Does `original_item_total + original_shipping_total − discount_total` equal `total` for every promotion type Medusa offers here, so the Odoo total always matches?
4. Cash on delivery detected from `payment_collections.payments.provider_id`: right field, and right once Paymob adds a second provider?
5. Skipping a cancelled order before it reaches Odoo, and storing metadata with a spread of the loaded metadata.

## GPT review, round 1

Reviewed `0080a5b`. One finding (in `vi2-gpt-review/docs/reviews/odoo-orders.md`):

- **[P2]** The plan's F1 lists the address, but neither the contact nor the sales order got one: a guest's order reached Odoo with no shipping address, and a registered customer's order address was ignored too. Send the order's shipping address to Odoo and cover a guest order and an order whose address differs from the customer's.

GPT did not rerun the checks or test against a real Odoo.

## Author response (`9400d71`)

- Real; I left the address out. Now:
  - A contact created from an order gets the address (street, street 2, city, postcode, country looked up by its code). An existing contact is not changed, since staff may have edited it.
  - Every order gets a delivery address under its contact (`res.partner`, type `delivery`, parent = the contact), found by its exact details or created, and set as the sales order's `partner_shipping_id`. A repeat order to the same address reuses it; a different address adds one. This runs under the contact lock, so two orders cannot create the same address twice.
  - Registration sends no address: a customer has none saved when `customer.created` fires.
  - The province is not sent: Odoo needs its own state record for it. Listed as a limit.
- Tests, written first and run against `0080a5b`: 3 service tests failed (contact with address, delivery address reuse and creation, `partner_shipping_id`) and 2 push tests failed (the order's address passed through; a different order address reaching the delivery address). All pass with the fix. Added a guard test that registration adds no delivery address.
- `npm run check`: backend 396 tests (46 suites), storefront 579, typecheck and lint clean.
- Live, same `medusa exec` run as before (real query, Redis locks, fake Odoo, no writes): both cash-on-delivery orders now pass a delivery address with street, city and country `eg` and the sales order gets it; totals unchanged (670, 570). No test data created.
- Not checked: a real Odoo's `res.partner` delivery fields and country lookup (O-0).

## GPT review, round 2

Reviewed only `9400d71`. Round 1 P2 resolved: a new contact gets the order address, each order gets a matching or new delivery address set as `partner_shipping_id`, existing contacts are left as they are. GPT noted the storefront keeps the governorate in Medusa's `city`, which goes to Odoo's `city`. No new findings. GPT did not rerun the checks or test against a live Odoo.

## Approved

GPT approved O-3a (`0080a5b`, `9400d71`) with no open findings. No PR yet: like O-2, the merge waits on the O-0 live check (address fields, country lookup, the line tax field name, `action_confirm`, prices kept) and on the Odoo service products `WEB-SHIPPING` and `WEB-DISCOUNT`. This branch is based on `odoo`, so it merges after `odoo`.
