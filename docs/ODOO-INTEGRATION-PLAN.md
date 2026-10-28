# Odoo Integration Plan

Status: plan for GPT review. Branch `odoo`, from `full-stack` `d039f3d`
(2026-10-28). No Odoo code yet. After GPT approves the plan, the parts in
section 3 marked "builds now" are built without Odoo credentials, against a
mocked Odoo; live checks wait for O-0.

Sources: `RD vs1.pdf` sections 2.2 (Odoo Product Mapping), 2.3 (Odoo Live
Stock Badge), 2.4-C (Odoo CRM and Sales ERP Integration), 2.5 (Order Status
Lifecycle), 2.6 (low-stock alerts from Odoo thresholds); Seif's decisions on
the workboard (2026-10-06, 2026-10-17) and his answers of 2026-10-28
(section 4).

A first draft of this plan on `claude/work` was reviewed by GPT. Its findings
are built in here: sold units restored by the stock poll (2.3), no retry for
registered customers' CRM leads and none for guests' (2.1), plain http to a
remote Odoo (2.1), and JSON-RPC's deprecation (D1).

## 1. What the RD asks for

| # | Direction | Entity | Trigger | Fields |
|---|---|---|---|---|
| F1 | Website to Odoo | Customer (CRM) | Registration, checkout | Name, phone, email, address, lead source |
| F2 | Website to Odoo | Sales order | Order confirmed | Order ID, products, quantities, taxes, discount, Paymob ref |
| F3 | Odoo to website | Inventory balance | Real-time / webhook | SKU, warehouse quantities, safety stock |
| F4 | Odoo to website in the RD; Medusa to Odoo by D6 | Shipment dispatch | Dispatch | Bosta AWB, dispatch date, delivery status |
| F5 | Both | Product mapping | n/a | Medusa variant matched to Odoo product by SKU and barcode |

Order lifecycle (RD 2.5) as Odoo sees it:

| Website status | Odoo state | What drives it |
|---|---|---|
| Pending payment | Draft quotation | `order.placed` |
| Paid / processing | Confirmed sales order | Card: Paymob capture (Paymob not built yet). COD: at placement (D5) |
| Shipped / out for delivery | Delivery order in progress | Staff in Odoo; Bosta AWB written by Medusa (D6) |
| Completed | Invoice posted and reconciled | Odoo side (D7) |
| Payment failed | Cancelled quotation | `order.canceled` / payment failed |

## 2. Design

One rule decides most of it: **Medusa pulls and pushes; Odoo never calls
anything it must be trusted for.**

- Every write to Odoo (contact, CRM lead, sales order, AWB) is
  find-or-create by a key Medusa owns, so running it twice changes nothing.
- Every write is triggered by a Medusa event. The Redis event bus already
  retries a failing subscriber 5 times over about 2-3 minutes
  (`EVENT_RETRY` in `src/lib/redis-config.ts`). A scheduled job then catches
  anything still missing its Odoo id, so an Odoo outage of any length delays
  a sync but never loses one.
- Stock is re-read from Odoo in full every minute, so it heals itself.

```text
                     Medusa server / worker
  customer.created ─▶ subscriber ─▶ push-customer-to-odoo ───┐
  order.placed ─────▶ subscriber ─▶ push-order-to-odoo ──────┤
  payment captured ─▶ subscriber ─▶ confirm-odoo-order ──────┤
  order.canceled ───▶ subscriber ─▶ cancel-odoo-order ───────┤──▶ odoo module ──▶ Odoo external API
  every 5 min: reconcile-odoo job (orders + customers) ──────┤    (one service, fetch + timeout)
  every 1 min: sync-odoo-stock job ─▶ Medusa inventory levels┘
```

### 2.1 Pieces (Medusa primitives only, no new dependency)

| Piece | Where | Does |
|---|---|---|
| `odoo` module | `src/modules/odoo/` | Service only, no tables. `call(model, method, args, kwargs)` over `fetch` with a 10 s `AbortSignal.timeout`. Signs in once and caches the user id; drops it on an auth error. Maps failures to `unreachable` (network, timeout, HTTP 429/5xx), `auth` (bad key, no rights), `rejected` (Odoo refused the request) and `invalid_response`; Odoo's message goes to server logs only. Workflows use small methods on it (`findProductsBySku`, `readStock`, `upsertPartner`, `upsertLead`, `upsertQuotation`, `confirmOrder`, `cancelOrder`), each added with the task that first needs it, never raw RPC. |
| Odoo settings | `src/lib/odoo-config.ts` | Same shape as `fileModules`: the module loads only when all of `ODOO_URL`, `ODOO_DB`, `ODOO_LOGIN`, `ODOO_API_KEY` are set. None: the store runs without Odoo. Some: refuses to start. Tests: never loaded. `ODOO_URL` must be https, or http only to `localhost`, `127.0.0.1` or `[::1]`, because the API key travels in every request body. Until O-2, production may start without Odoo; from O-2 on it must refuse. |
| `odoo-check` script | `src/scripts/` | `npx medusa exec ./src/scripts/odoo-check.ts <sku>`: signs in and looks the SKUs up. The live check once O-0 is done. |
| `sync-odoo-stock` job | `src/jobs/` | Every minute: one `search_read` of `stock.quant` (on-hand) and one of open outgoing `stock.move` (demand) for the website's Odoo warehouse, one of the not-cancelled moves of website orders that still hold a Medusa reservation (by `client_order_ref`), plus those Medusa reservations, apply the rule in 2.3, compare with Medusa's levels at Cairo Warehouse, and update only the changed ones in one `updateInventoryLevelsWorkflow` call. Full snapshot each run, so no cursor to lose. Odoo down: Medusa stock is left as it is and the failure logged. |
| Contact lock | `src/workflows/` | Every find-or-create of a contact and lead runs under one Medusa lock keyed by the email, trimmed and lower-cased (`odoo-contact:<email>`), shared by the customer and order workflows (GPT review P2). Medusa's lock is Redis-backed, so it holds across the server and worker. A registration and a checkout for the same email therefore cannot both search Odoo, find nothing and both create. The order workflow takes its order lock first, then the contact lock; the customer workflow takes only the contact lock, so there is no lock-order deadlock. If Odoo already holds several contacts with that email (made by hand), the lowest id is used and the duplicates are logged. An Odoo-side unique constraint was not chosen: it needs a custom Odoo module, which Odoo Online does not allow (D1). |
| Customer subscriber + workflow | `src/subscribers/`, `src/workflows/` | `customer.created` runs `push-customer-to-odoo`: under the contact lock, find-or-create the `res.partner` by email (tagged "Website"), then find-or-create the `crm.lead` for that partner with source "Website" (F1, D8), and store both ids in `customer.metadata` (`odoo_partner_id`, `odoo_crm_lead_id`). Log and throw on failure so the event bus retries, as `order-received-email.ts` does. |
| Order subscribers + workflows | `src/subscribers/`, `src/workflows/` | `push-order-to-odoo`: lock per order (the `acquireLockStep` pattern of `allocate-order-line-stock`), run the same partner and lead steps under the contact lock (so a guest at checkout also gets a contact and a lead), find-or-create the `sale.order` by `client_order_ref` = Medusa order id, lines with Medusa's own unit price and discount (so Odoo pricelists cannot change what the customer paid), and store `odoo_sale_order_id` and `odoo_crm_lead_id` in `order.metadata`. COD orders are confirmed in the same run (D5). `confirm-odoo-order` (card, on Paymob capture) and `cancel-odoo-order` call `action_confirm` / `action_cancel` on that id. |
| `reconcile-odoo` job | `src/jobs/` | Every 5 minutes, two passes. Orders from the last 14 days with no `odoo_sale_order_id` or `odoo_crm_lead_id`, or whose Odoo state is behind Medusa's, get the order workflows run again. Registered customers (`has_account`) from the last 30 days with no `odoo_crm_lead_id` get `push-customer-to-odoo` run again, so a lead is created even for someone who never orders. Attempts and the last error go in the record's metadata, visible in the admin. Longer outages: run the job by hand with a wider window. |

The lead is found by its contact, so a guest who registers later, or a
customer who orders many times, gets one lead.

### 2.2 Why this shape

- **Idempotent without a sync table.** Odoo is searched by a key Medusa owns
  (email, `client_order_ref`) before anything is created, under a per-order
  lock and a per-email contact lock. The Odoo ids live in Medusa metadata. A sync-history table is added
  only if Seif wants history beyond "current status and last error".
- **Polling over webhooks for stock.** A one-minute poll meets D10, needs no
  public endpoint and cannot be forged. Odoo's automation webhooks send no
  signature; if one is ever added it should only start the same job early,
  never carry quantities Medusa trusts.
- **Prices stay Medusa's** (data ownership baseline). Odoo receives them on
  the order lines and never sends prices back.

### 2.3 Inventory rule

Medusa `stocked_quantity` for a variant at Cairo Warehouse
= Odoo on-hand in the website's Odoo warehouse
− all open outgoing Odoo demand from that warehouse (every channel, website included)
+ for each website order: the smaller of Medusa's reservation for this SKU
  and the units Odoo already counts for that order and SKU
− store-wide safety stock, floored at 0.

"Open outgoing demand" is the quantity on Odoo stock moves out of the
warehouse that are neither done nor cancelled. "Units Odoo already counts for
an order" is the quantity on that order's moves that are not cancelled: still
open (in the demand above) or done (already gone from on-hand). A move belongs
to a website order when its sales order's `client_order_ref` is a Medusa order
id. Odoo creates these moves only when a sales order is confirmed; a draft
quotation has none.

Odoo also sells through other channels (D4b), so their demand comes off. A
website order that Medusa reserves *and* Odoo already counts (in demand or as
a delivery) would come off twice, so that overlap, and only that overlap, is
added back. A reservation Odoo does not count yet (an unpaid card order still
a draft quotation, or an order not yet in Odoo) is not added back and keeps
holding its units (GPT review P1). Each sale is counted once. With w units
ordered, other channels' demand o and safety stock s, website availability
(stocked minus Medusa's reservations) is:

| Stage of a website order (w units) | Odoo on-hand | Open demand (this order) | Odoo counts (this order) | Medusa reservation | Added back | Available on the website |
|---|---|---|---|---|---|---|
| Placed, not yet in Odoo | H | 0 | 0 | w | 0 | H − o − s − w |
| Card, unpaid: draft quotation in Odoo | H | 0 | 0 | w | 0 | H − o − s − w |
| Confirmed in Odoo (card paid, or COD), not fulfilled anywhere | H | w | w | w | w | H − o − s − w |
| Fulfilled in Medusa, Odoo delivery not validated | H | w | w | 0 | 0 | H − o − s − w |
| Odoo delivered d of w, Medusa not fulfilled | H − d | w − d | w | w | w | H − o − s − w |
| Odoo delivered all, Medusa not fulfilled yet | H − w | 0 | w | w | w | H − o − s − w |
| Delivered in both | H − w | 0 | w | 0 | 0 | H − o − s − w |
| Cancelled in Odoo, still reserved in Medusa | H | 0 | 0 | w | 0 | H − o − s − w |
| Cancelled in both | H | 0 | 0 | 0 | 0 | H − o − s |

In every stage the order's w units are held exactly once, so the poll never
puts sold units back and never hides them twice.

This holds however long staff take to validate the Odoo delivery, and in
whichever order Medusa and Odoo record it. A delivery never validated in Odoo
keeps its units held; the stock job logs website orders fulfilled in Medusa
whose Odoo delivery is still open after 2 days, so staff see them.

Variants with stock tracking on and no matching Odoo SKU show as out of stock
(fail closed) and are listed in the job's log. A SKU whose barcode differs
between the two systems is reported, never fixed automatically (D2).

Making Odoo the stock owner changes data ownership, so it needs an ADR in
`docs/decisions/` (shared folder, Seif approves) before O-2 merges.

## 3. Build order

One workboard task each; Claude writes, GPT reviews. "Builds now" means the
code and its unit tests are written against a mocked Odoo before O-0; only the
live check waits.

| Task | Size | Builds now? | Needs before merge | Done when |
|---|---|---|---|---|
| O-0 Answers and test access | Seif | — | — | Section 4's open items answered; an Odoo test database and API key in `apps/backend/.env` (never in chat). |
| O-1 Odoo module, settings, check script | S | Yes, all of it | — | Unit tests: sign-in cached and dropped on auth errors, timeout, 429/5xx, wrong answers, each mapped to its category; settings: none/some/all set, https and loopback http. Live: `odoo-check` finds a real SKU. |
| O-2 Stock Odoo to Medusa | M | Yes: the rule in 2.3 as a pure function, the job, the Medusa update. Odoo's warehouse id and the safety number are settings, filled after O-0. | ADR approved; O-0 for the live check; JSON-2 move if D1 says Odoo 19+ | Unit tests for every row of the 2.3 table (including the unpaid card quotation, partial and full Odoo delivery before Medusa fulfils, and cancellation on one side only), unmapped SKUs, Odoo down. Live: Cairo Warehouse levels match the rule. Unblocks SF 4 (stock badge). |
| O-3 Customers and orders to Odoo | L | Yes, except card confirmation, which needs Paymob's capture event | O-0 for the live check (and the CRM app installed in Odoo) | Placed order appears as a quotation with matching lines and totals; running twice creates one; COD confirmed at once; cancel cancels; a registration and a checkout for the same email at the same moment create one contact and one lead; the reconcile job pushes orders, contacts and leads created while Odoo was down, including a registered customer who never orders and a guest whose lead failed. |
| O-4 Bosta AWB Medusa to Odoo | S | No | The Bosta provider (not built) | The AWB lands on the Odoo delivery order's tracking reference; retried by the reconcile job. |
| O-5 Catalog import from Odoo | M | Partly: script and tests against a mocked Odoo | Which Odoo fields hold brand, name and description (O-0) | Creates Medusa products and variants from Odoo SKUs and barcodes once; re-running creates nothing new. Seif (2026-10-17): products are imported from Odoo first, then also created in Medusa, and the import brings brands. This is the old Core 4. |

Order: O-1, then O-2 and O-3 (independent of each other), then O-5. O-4
follows the Bosta provider.

## 4. Decisions

| # | Question | Answer (Seif) | Effect |
|---|---|---|---|
| D1 | Odoo version, edition, hosting? | **Open** | Blocks live checks only. O-1 uses JSON-RPC provisionally: Odoo 19's docs mark it deprecated and schedule its removal for Odoo 22, so if the target is 19 or newer the client moves to the JSON-2 API before O-2 merges (one method). Odoo Online allows the external API only on its Custom plan and no custom modules. |
| D2 | Which system creates products, SKUs, barcodes? | Odoo creates SKUs and barcodes; Medusa owns names, descriptions, images, prices and EDA data (2026-10-28). Products are imported from Odoo first (2026-10-17). | Medusa variant `sku` = Odoo `default_code`; `barcode` checked as a second key; mismatches reported. O-5 is required. |
| D3 | Which Odoo warehouse feeds the website? | One warehouse, Cairo (2026-10-17); **which Odoo warehouse record is open** | A setting in O-2. |
| D4a | Safety stock? | One store-wide number (2026-10-28); **the number is open** | A setting, 0 until set. |
| D4b | Other sales channels in Odoo? | Yes | Rule in 2.3. |
| D5 | When is the sales order confirmed? | Card: on Paymob capture. COD: at placement. | 2.1 order workflows. |
| D6 | Who creates Bosta shipments? | Medusa (the planned Bosta provider) | Matches `docs/INTEGRATIONS.md`. Medusa writes the AWB to Odoo (O-4); nothing about shipping is read from Odoo. |
| D7 | Who posts and reconciles invoices? | Odoo side | Medusa never touches invoices. |
| D8 | What does Odoo get for a website customer? | A contact tagged "Website" and a CRM lead with source "Website", registered or guest | Odoo's CRM app must be installed. |
| D9 | Tax on Odoo order lines? | Wait for the VAT decision | Lines without tax until then. |
| D10 | How fast must stock follow Odoo? | Within one minute | Polling; no webhook. Replaces the 2026-10-17 suggestion of a webhook plus a 15-30 minute check. |

Also open: whether warehouse staff validate the Odoo delivery order as they
pack (proposed: yes; Medusa only adds the AWB). The rule in 2.3 is correct
either way; this only decides how current Odoo's own reports are.

## 5. Not in this plan

A live Odoo stock check when an order is placed (suggested 2026-10-17;
the one-minute poll and Medusa's reservations cover it), low-stock alerts on
the analytics dashboard (RD 2.6), SMS/email per order status (separate
notification work), multi-warehouse storefront wording, writing stock from
Medusa to Odoo, two-way product content sync.

## 6. Review responses (GPT review of aafeb44)

- **P1, an unpaid card quotation made reserved stock available again: fixed.**
  Medusa's reservation is now added back only up to the units Odoo already
  counts for that order (its not-cancelled moves, open or done). A draft
  quotation has no moves, so its reservation keeps holding the units. While
  fixing it, the first version of the fix (open demand only) turned out to
  hide units twice after a partial Odoo delivery, so done moves count too.
  The table in 2.3 now has the pending-payment stage, partial and full Odoo
  delivery before Medusa fulfils, and one-sided cancellation, each with its
  resulting website availability.
- **P2, contact and lead creation could race: fixed.** Both workflows take a
  shared Redis-backed lock keyed by the normalised email before searching
  Odoo (2.1, "Contact lock"). A unique constraint in Odoo was not chosen
  because it needs a custom Odoo module, which Odoo Online does not allow.
