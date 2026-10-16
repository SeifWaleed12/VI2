# VI2 HTTP API Reference

Every HTTP request in the project, grouped by domain, with what each part of the URL means.
Written from the code in `apps/backend` (Medusa v2) and `apps/storefront` (Next.js). Nothing here was run against a live server.

---

## Part 1 - How to read a request

### 1.1 The three layers

```
Browser ──(1)──► Next.js storefront ──(2)──► Medusa backend ──► Postgres / Redis
   │                 :8000 (/api/*)               :9000
   └───────────(3) direct, via the Medusa JS SDK ────────────►
```

1. **Browser → Next.js `/api/*`**: used for anything that touches the login token. The token lives in an HttpOnly cookie (`vi2_auth_token`) that browser JavaScript cannot read, so Next.js reads it and forwards it to Medusa. This is the "BFF" (backend-for-frontend) pattern.
2. **Next.js → Medusa**: server-to-server `fetch`. Always sends `x-publishable-api-key`, and `Authorization: Bearer <token>` when signed in.
3. **Browser/Next.js → Medusa through the SDK** (`lib/medusa/client.ts`, `server.ts`): catalog, cart, regions, shipping. No login token is involved, so these go straight to Medusa.

### 1.2 Anatomy of one URL

```
GET /store/products?limit=100&offset=0&fields=id,title&region_id=reg_01M3...
│   │      │        └────────────── query string (filters, paging, what to return)
│   │      └── resource (products)
│   └── API area: /store = public shop, /admin = staff dashboard, /auth = login
└── HTTP method
```

| Method | Meaning | Changes data? |
|---|---|---|
| GET | Read | No |
| POST | Create, or run an action | Yes |
| PUT | Replace/update | Yes |
| DELETE | Remove | Yes |
| OPTIONS | Browser's CORS "may I?" check (see 1.5) | No |

### 1.3 Query-string words, explained

| Param | What it does |
|---|---|
| `limit` | Page size. `limit=100` = at most 100 results. Medusa default is 50. |
| `offset` | How many results to skip. Page 2 with `limit=100` is `offset=100`. |
| `count` (in the response) | Total matches across all pages, so the UI can build pagination. |
| `fields` | Which fields to return, so responses stay small. Comma separated. |
| `region_id` | The selling region (here Egypt). **Required for prices**: `calculated_price` is only computed for a region/currency. |
| `handle` | The URL slug of a product or category (`creatine`). |
| `q` | Free-text search. |
| `order` | Sort, e.g. `created_at` or `-created_at` (minus = descending). |
| `category_id` | Filter to these categories (repeatable: `category_id=a&category_id=b`). |
| `brand_id` | **Custom** filter added by this project (see 4.4). |
| `parent_category_id` | Categories whose parent is this ID (`null` = top level). |
| `%2C` and `%2A` | URL-encoding. `%2C` = `,` and `%2A` = `*`. Same meaning, just escaped. |

### 1.4 The `fields` syntax

`fields` lets you say how deep to go.

| Written as | Meaning |
|---|---|
| `id,title,handle` | Only those columns of the main record. |
| `variants.id,variants.sku` | Include the related `variants`, but only those columns. |
| `*items` | Include the related `items` with **all** their columns. |
| `*items.variant` | Include items **and** each item's variant (all columns). |
| `+metadata` / `-metadata` | Add / remove a field from the default set. |

So `fields=brand.id,brand.name,variants.calculated_price,options.values.value` reads: "for each product give me its brand's id and name, each variant's price, and each option's values".

#### "Options", "variants" and "option values"

This is Medusa's product model, and the question that came up in the log:

```
Product "Creatine"
 ├─ options:  [ { title: "Size", values: ["300g","500g"] },
 │              { title: "Flavor", values: ["Plain","Lemon"] } ]
 └─ variants: [ "300g / Plain" (sku, price, stock)
                "300g / Lemon"
                "500g / Plain" ... ]
```

- **Option** = a choice the buyer makes (Size, Flavor). `options.id`, `options.title`, `options.values.value`.
- **Option value** = one choice in it (`300g`).
- **Variant** = one specific buyable combination. It has the `sku`, `barcode`, price (`calculated_price`), stock (`inventory_quantity`) and `options` (which value it picked for each option). Carts hold **variants**, not products.
- `manage_inventory` = whether stock is tracked; `allow_backorder` = whether it can be sold at zero stock.

### 1.5 Status codes and `OPTIONS`

| Code | Meaning in your log |
|---|---|
| 200 | OK, body returned. |
| 201 | Created (brand, variant, registration). |
| 204 | OK, empty body. Used for `OPTIONS` preflights. |
| 304 | Not modified: the browser sent `If-None-Match` (ETag) and the data is unchanged, so no body was sent. Good: cache is working. |
| 400 | Bad input (failed validation). |
| 401 / 403 | Not signed in / not allowed. |
| 404 | Not found. |
| 429 | Too many attempts (login/reset/password rate limit). |
| 500 | Server error. |

**`OPTIONS`** is the CORS preflight. When a page on one origin (`localhost:3002`) calls another (`localhost:9000`) with custom headers like `x-publishable-api-key`, the browser first asks the server "is this origin allowed?". The server answers 204 with `Access-Control-Allow-*` headers, and only then does the browser send the real `GET`.

The `← http://localhost:3001/` at the end of each log line is the **Origin/Referer** that sent the request. `← -` means it had none, i.e. a server-side call from Next.js (no browser).

### 1.6 Headers used everywhere

| Header | Value | Purpose |
|---|---|---|
| `x-publishable-api-key` | `pk_...` | Identifies the storefront and its sales channel/region. Required on every `/store/*` call. |
| `Authorization` | `Bearer <JWT>` | Signed-in customer. Sent by the Next.js proxies from the cookie. |
| `x-medusa-locale` | `en-US` / `ar-EG` | Which language to return (`medusaLocale()` in `lib/i18n`). |
| `Content-Type` | `application/json` | Required on all JSON bodies (the proxies reject anything else). |
| Admin `credentials: "include"` | cookie | Admin UI uses the Medusa admin session cookie, not a bearer token. |

---

## Part 2 - Your log, line by line

| Log line | What it is |
|---|---|
| `GET /store/customers/me (200)` | Next.js asks "who is signed in?" (`/api/auth/me` proxy). |
| `GET /store/regions` | Loads regions to find Egypt's `region_id` (needed for prices). Called a lot because `resolveRegionId()` runs before nearly every product/cart call. |
| `GET /store/carts/cart_01M4...?fields=*items,*items.variant,...` | Loads the cart with line items, each item's variant and product, addresses, shipping methods, promotions and payment collection (`CART_FIELDS`). |
| `GET /store/products?limit=100&offset=0&fields=...&region_id=...` | Catalog page: first 100 products with brand, EDA registration, images, variants + prices + stock, options, categories. |
| `GET /store/products?handle=creatine&limit=1&...` | Product detail page: looks the product up by slug, takes the first match. |
| `GET /store/product-categories?limit=50&offset=0&fields=id,name,handle,parent_category_id,rank` | Builds the category tree (`getCategoryTree`), paged 50 at a time. `rank` = display order. |
| `GET /store/product-categories?limit=100&fields=id,name,handle,parent_category_id,rank` | Same, but a second caller with different paging (see findings). |
| `GET /store/brands` | Active brands for the shop filter (custom endpoint). |
| `GET /static/...webp` | Uploaded image served from Medusa's local file storage. |
| `GET / (404)` | Something requested the backend root. Harmless: Medusa has no `/` route. |
| `OPTIONS /store/regions` x6 from `:3002` | CORS preflights. **See finding F1.** |

### Findings from the log

- **F1 - port 3002 is not allowed by CORS.** `apps/backend/.env` has `STORE_CORS=http://localhost:8000,:3000,:3001,...` but not `:3002`. The `OPTIONS` calls from `:3002` repeat six times with **no following `GET`** from that origin, which is what a browser does when a preflight fails. Add `http://localhost:3002` to `STORE_CORS` (and `AUTH_CORS`) if you run the storefront on 3002.
- **F2 - duplicate requests.** `/store/product-categories` is fetched about 8 times in a row and `/store/regions` repeatedly. Each page render re-fetches (the category fetch uses `cache: "no-store"`). Cache `getCategoryTree` and `resolveRegionId` per request.
- **F3 - heavy product query.** The 100-product list with 25 nested fields took 850 ms on first call. Fine for dev; consider smaller pages on the shop grid.

---

## Part 3 - API by domain

Legend: **Auth** = what is required. **Layer** = 1 browser→Next, 2 Next→Medusa, 3 SDK direct.

### 3.1 Authentication (customer)

Token is stored in the `vi2_auth_token` HttpOnly cookie. All browser POSTs must have an `Origin` equal to the storefront (`checkAuthOrigin`), and a JSON content type.

| Browser calls (1) | → Medusa (2) | Body | Success response |
|---|---|---|---|
| `POST /api/auth/login` | `POST /auth/customer/emailpass`, then `GET /store/customers/me` | `{email, password}` | `{ok, customer}` and sets cookie |
| `POST /api/auth/register` | `POST /store/auth/register` (custom) | `{email, password, first_name, last_name, phone?}` | `{ok, customer}` and sets cookie |
| `GET /api/auth/me` | `GET /store/customers/me` | - | `{ok, customer}`, 401 if expired |
| `POST /api/auth/refresh` | `POST /auth/token/refresh` | - | new cookie. **Not called by any code** |
| `POST /api/auth/logout` | none | - | clears cookie |
| `POST /api/auth/forgot-password` | `POST /auth/customer/emailpass/reset-password` | `{email}` | always the same message (never reveals whether the email exists) |
| `POST /api/auth/reset-password` | `POST /auth/customer/emailpass/update` (Bearer = reset token) | `{token, password}` | `{ok}` |
| `POST /api/auth/password` | `POST /store/customers/me/password` (custom) | `{current_password, new_password}` | `{ok}` |

**Backend rules** (`middlewares.ts`):
- Login and reset: rate limited (`429` + `Retry-After`). Failed logins counted per email, cleared on success.
- Register / update password: `requireStrongPassword`.
- Registration (`store/auth/register`): validated by `registrationSchema` (strict, email lower-cased, max lengths). Duplicate registered email returns a deliberately vague 400. If customer creation fails after the auth identity was created, the identity is deleted (compensation). Returns `201 {token, customer}`.
- Password change (`respondToPasswordChange`): `200 {success:true}`; `400 {code:"wrong_password"}`; `400 {code:"weak_password"}`; `400 {code:"invalid_request"}`; `429` when locked.

### 3.2 Catalog - products

| Method + URL | Layer | Notes |
|---|---|---|
| `GET /store/products` | 3 | Via `listProducts`. |
| `GET /store/products?handle=<slug>&limit=1` | 3 | `getProductByHandle`. |
| `GET /store/products/:id` | 3 | `getProduct`. |

Query parameters used by `listProducts`:

| Param | Source | Notes |
|---|---|---|
| `limit` | clamped 1..`MAX_PAGE_SIZE` (100), default 50 | |
| `offset` | `>= 0` | |
| `fields` | `PRODUCT_FIELDS` | brand, EDA registration, images, metadata, variants (price, stock, options), options, categories |
| `region_id` | `resolveRegionId()` | required for prices |
| `category_id[]` | caller | storefront sends a category **plus its subcategories**, because Medusa matches only the IDs given |
| `brand_id[]` | caller | custom, see 3.4 |
| `q`, `order` | caller | |
| header `x-medusa-locale` | locale | |

Response: `{products: [...], count, limit, offset}`. A `400` becomes `InvalidCatalogFilterError` ("these filters are not valid").

**Custom field whitelist**: `allowFields(...)` in `middlewares.ts` lets the store ask for `brand.id|name|status`, `eda_registration.registration_number|is_approved`, `categories.id|name|handle` (Medusa normally blocks fields from custom modules).

### 3.3 Catalog - categories and regions

| Method + URL | Layer | Notes |
|---|---|---|
| `GET /store/product-categories?limit&offset&fields=id,name,handle,parent_category_id,rank` | 3 | `getCategoryTree`, loops 50 at a time until `count` is reached, header `x-medusa-locale`, 8 s timeout |
| `GET /store/product-categories?limit&offset&fields=*category_children,*parent_category[&parent_category_id=]` | 3 | `getCategories` |
| `GET /store/product-categories/:id?fields=*category_children,*parent_category,*products` | 3 | `getCategory` |
| `GET /store/product-categories?handle=<slug>&limit=1&fields=...` | 3 | `getCategoryByHandle` |
| `GET /store/regions` | 3 | `regions.list()` |
| `GET /store/regions/:id` | 3 | `regions.retrieve()` |

### 3.4 Brands (custom module)

Data model `Brand`: `id, name, slug (unique), description?, logo?, country?, status ("active"|"inactive")`.

| Method + URL | Auth | Behaviour |
|---|---|---|
| `GET /store/brands` | publishable key | Active brands only, sorted by name. `{brands}` |
| `GET /store/brands/:id` | publishable key | Finds by id, falls back to **slug**. `404` if missing or inactive. `{brand}` |
| `GET /store/products?brand_id=a&brand_id=b` | publishable key | Middleware `filterProductsByBrand` resolves the active brands' product IDs and rewrites the query to `id=...`, so Medusa still handles publishing, price and count. 1..50 ids matching `[A-Za-z0-9_-]{1,64}`, else `400`. Unknown/inactive brands give an empty page. |

### 3.5 Cart

All through the SDK (layer 3), all send `fields=CART_FIELDS`
(`*items,*items.variant,*items.product,*shipping_address,*billing_address,*shipping_methods,*promotions,*payment_collection`).

| Action | HTTP | Body |
|---|---|---|
| Load cart | `GET /store/carts/:id` | |
| Create cart | `POST /store/carts` | `{region_id}` |
| Add item | `POST /store/carts/:id/line-items` | `{variant_id, quantity}` |
| Change quantity | `POST /store/carts/:id/line-items/:lineId` | `{quantity}` |
| Remove item | `DELETE /store/carts/:id/line-items/:lineId` | then re-reads the cart |
| Set email + addresses | `POST /store/carts/:id` | `{email, shipping_address, billing_address}`. Country code lower-cased, postal code defaults to `00000`, billing defaults to shipping |
| Choose shipping | `POST /store/carts/:id/shipping-methods` | `{option_id}` |
| Apply promo code | `POST /store/carts/:id/promotions` | `{promo_codes:[code]}` |
| Remove promo code | `DELETE /store/carts/:id/promotions` | `{promo_codes:[code]}` |

**Backend guard** (`cart-access.ts`, mounted on `/store/carts/:id`, everything under it, and `/store/payment-collections`):
- Cart owned by a **registered** customer: only usable with that customer's login, otherwise `403`.
- Typing an email on a guest cart attaches/creates a **guest** customer, never an account.
- `POST /store/carts` without login ignores an email in the body.

### 3.6 Shipping, payment, checkout, orders

| Step | HTTP | Layer |
|---|---|---|
| Shipping options | `GET /store/shipping-options?cart_id=<id>` | 3. If Medusa returns none, the UI falls back to hard-coded Standard (85) and Express (140) options (`shipping.ts`) |
| Start payment | `POST /store/payment-collections` then `POST /store/payment-collections/:id/payment-sessions` with `{provider_id:"pp_system_default"}` | 3 (the SDK does both) |
| Place order | `POST /api/checkout/complete` `{cartId}` → `POST /store/carts/:cartId/complete` | 1 then 2. Adds Bearer token if signed in |
| My orders | `GET /api/orders?limit=N` → `GET /store/orders?<params>` | 1 then 2. 401 if not signed in |
| Order receipt | `GET /store/orders/:id?fields=id,display_id,status,payment_status,currency_code,total,created_at,items.id,items.title,items.quantity,items.unit_price,items.total` | 3. Guest-safe: the order id is the capability and no contact or address fields are requested |

Checkout response handling (`checkout.ts`): `type:"order"` → success; `type:"cart"` with `error` → not placed; `403` → cart belongs to another account; anything else → "payment status unknown, retry confirmation for this cart".

**Production lock**: `POST /store/carts/:id/complete` throws "Production checkout is not configured" when `NODE_ENV=production`; the storefront also refuses before calling. The `pp_system_default` provider is a placeholder, not COD or Paymob.

### 3.7 Admin dashboard (custom, staff only)

Protected by `authenticate("user")` + `adminAccess` + `managerLayoutView` on `/admin/*`. The admin UI calls with `credentials: "include"` (session cookie).

**Brands**

| Method + URL | Body | Response |
|---|---|---|
| `GET /admin/brands[?status=active\|inactive]` | | `{brands}` sorted by name |
| `POST /admin/brands` | `{name, slug, description?, logo?, country?, status?}` | `201 {brand}` |
| `GET /admin/brands/:id` | | `{brand}` (id or slug), `404` |
| `PUT /admin/brands/:id` | any subset of the fields above (strict) | `{brand}` |
| `DELETE /admin/brands/:id` | | `{id, deleted:true}` |

Validation (`brandSchema`): name required, `slug` lowercase-kebab (`^[a-z0-9]+(-[a-z0-9]+)*$`), `logo` empty or an http(s) URL, `description` up to 5000 chars. Invalid body → `400 {message:"Invalid brand details"}`. Errors mapped by `brandErrorResponse`.

**EDA registration** (Egypt Drug Authority number on a product)

| Method + URL | Body | Response |
|---|---|---|
| `GET /admin/products/:id/eda` | | `{eda_registration: {...} \| null}` |
| `POST /admin/products/:id/eda` | `{registration_number (<=100 chars), is_approved: boolean}` | `{eda_registration}` |
| `DELETE /admin/products/:id/eda` | | `{eda_registration: null}` |

**Quick variant** (add an option value plus its variant in one step)

`POST /admin/products/:id/quick-variant`, body `{option_title, option_value, title?, sku?, barcode?, prices:[{amount, currency_code (3 lowercase letters)}] (1-50), manage_inventory?}` → `201 {variant}`. `400` on invalid body.

**Staff password**

`POST /admin/users/me/password` `{current_password, new_password}`, same responses and rate limit as the customer one.

**Blocked**: `POST /admin/orders/export` always returns `403` (an export would put customer details at a public file address).

**Template stubs** (can be deleted): `GET /admin/custom`, `GET /store/custom`.

### 3.8 Built-in Medusa routes also used

`/auth/customer/emailpass`, `/auth/customer/emailpass/reset-password`, `/auth/customer/emailpass/update`, `/auth/token/refresh`, `/store/customers/me`, `/store/orders`, `/store/orders/:id`, plus the cart, payment, region, category and shipping routes above. Medusa's other admin routes (`/admin/products`, `/admin/orders`, ...) are used by the admin dashboard itself, not by this code.

---

## Part 4 - Quick lookup: who calls what

| Storefront file | Endpoints |
|---|---|
| `services/customer.ts` | `/api/auth/{me,login,register,logout,forgot-password,reset-password,password}` |
| `services/orders.ts` | `/api/orders`, `GET /store/orders/:id` |
| `services/checkout.ts` | `/api/checkout/complete` |
| `services/payment.ts` | cart retrieve, `payment-collections` |
| `services/cart.ts` | `/store/carts*` |
| `services/products.ts` | `/store/products*` |
| `services/categories.ts`, `category-directory.ts` | `/store/product-categories*` |
| `services/regions.ts` | `/store/regions*` |
| `services/shipping.ts` | `/store/shipping-options` |
| `services/brands.ts` | `/store/brands*` |

| Admin file (`apps/backend/src/admin`) | Endpoints |
|---|---|
| `routes/brands/page.tsx` | `/admin/brands`, `/admin/brands/:id` |
| `widgets/product-eda-widget.tsx` | `/admin/products/:id/eda` |
| `widgets/quick-add-variant-widget.tsx` | `/admin/products/:id/quick-variant` |
| `routes/settings/change-password/page.tsx` | `/admin/users/me/password` |

## Part 5 - Configuration that drives all of this

| Setting | Where | Value (local) |
|---|---|---|
| `NEXT_PUBLIC_MEDUSA_BACKEND_URL` | `apps/storefront/.env.local` | `http://localhost:9000` |
| `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` | same | `pk_...` (public by design) |
| `STORE_CORS` | `apps/backend/.env` | `:8000, :3000, :3001, docs.medusajs.com` |
| `ADMIN_CORS` | same | `:5173, :9000` |
| `AUTH_CORS` | same | `:5173, :9000, :8000, :3000, :3001` |
| `STOREFRONT_ORIGIN` | storefront env, optional | overrides the origin check for `/api/auth/*` POSTs |
| `MEDUSA_SHIPPING_STANDARD_ID` / `_EXPRESS_ID` | storefront env, optional | ids for the fallback shipping options |
| SendGrid | `lib/notification-config.ts` | the only third-party service, used for emails |
