# E-Commerce Backend Architecture — Agent Reference

## Egypt Health & Wellness E-Commerce Platform
**Version:** 1.0  
**Purpose:** Authoritative architectural reference for development agents and engineers.

---

## 1. Architecture Objective

Build a production-ready, scalable headless e-commerce platform for the Egyptian market, inspired by large international e-commerce platforms such as iHerb.

The backend is based on **Medusa v2**. The storefront is a separate **Next.js** application. Medusa remains the commerce backend and source of core commerce behavior; custom business capabilities are implemented through Medusa's extension mechanisms rather than modifying Medusa core.

The initial launch is an aggressive **4-week MVP**, so architecture must remain clean and extensible while avoiding unnecessary Phase-2 functionality.

---

# 2. AUTHORITATIVE HIGH-LEVEL ARCHITECTURE

```text
                              CUSTOMERS
                                  |
                                  v
                         +------------------+
                         |    Cloudflare    |
                         | DNS / CDN / WAF  |
                         |     / DDoS       |
                         +--------+---------+
                                  |
                               HTTPS
                                  |
                                  v
                         +------------------+
                         |  Hetzner Cloud   |
                         |      VPS         |
                         |     Coolify      |
                         +--------+---------+
                                  |
              +-------------------+-------------------+
              |                   |                   |
              v                   v                   v
       +-------------+     +-------------+     +-------------+
       |   Next.js   |     |   Medusa    |     |   Medusa    |
       |  Storefront |---->|   Server    |     |   Worker    |
       +-------------+ API +------+------+     +------+------+
                                  |                   |
                                  +---------+---------+
                                            |
                              +-------------+-------------+
                              |                           |
                              v                           v
                       +-------------+              +-------------+
                       | PostgreSQL  |              |   Redis     |
                       | Managed DB  |              | Cache / Job |
                       +-------------+              | / Workflow  |
                                                   +-------------+
                                  |
                                  v
                            +-----------+
                            |Meilisearch |
                            |  Search   |
                            +-----------+

External systems:
    Odoo     <---- inventory/data integration ----> Medusa
    Paymob   <---- payment provider -------------> Medusa
    Bosta    <---- fulfillment/shipping ----------> Medusa

Object/file storage:
    S3-compatible storage / Cloudflare R2
    for product images and uploaded files.
```

### Infrastructure principles

- Cloudflare is the public edge.
- Coolify manages application deployment on Hetzner.
- Next.js is the customer-facing storefront.
- Medusa Server is the commerce API/backend.
- Medusa Worker handles background jobs/workflows where required.
- PostgreSQL is the primary persistent database.
- PostgreSQL should be **managed**, not manually maintained inside the application VPS where practical.
- Redis is used for supported caching, jobs, workflows, temporary state, and distributed coordination where appropriate.
- Meilisearch is the dedicated product-search engine.
- S3-compatible storage/R2 is used for product images and files.
- Do not put business logic in the Next.js storefront that belongs in Medusa.
- Never expose private integration credentials to the browser.

---

# 3. APPLICATION BOUNDARIES

## 3.1 Next.js Storefront

Responsible for:

- UI/UX
- Rendering pages
- Customer interaction
- Calling backend APIs
- Client-side state where necessary
- Product browsing
- Search UI
- Cart UI
- Checkout UI
- Authentication UI
- Customer account UI
- Order-history UI
- Tracking UI

NOT responsible for:

- Direct PostgreSQL access
- Direct Odoo access
- Direct Paymob secret API access
- Direct Bosta secret API access
- Inventory business rules
- Payment verification
- Order creation outside the backend
- Supplier/warehouse business logic

The frontend communicates with Medusa through its APIs.

---

# 4. MEDUSA AS THE COMMERCE BACKEND

Medusa v2 provides the core commerce foundation.

Use Medusa's existing capabilities for:

- Products
- Product variants
- Categories
- Customers
- Carts
- Orders
- Pricing
- Promotions
- Inventory
- Stock locations
- Payment collections
- Payment sessions
- Payments/transactions
- Fulfillment
- Shipping methods
- Regions
- Sales channels
- API keys
- Authentication/users

Do not recreate these systems as custom tables/modules unless there is a documented business requirement that Medusa cannot satisfy.

---

# 5. MEDUSA INTERNAL ARCHITECTURAL RULE

**Do NOT modify Medusa core source code.**

Extend Medusa through:

- Custom modules
- Module links
- API routes
- Workflows
- Subscribers
- Scheduled/background jobs
- Payment providers
- Fulfillment providers
- Other supported Medusa extension mechanisms

Never solve a custom requirement by editing node_modules or Medusa framework source.

---

# 6. CORE COMMERCE MODEL

## Product

```text
Product
 ├── title
 ├── description
 ├── images
 ├── categories
 ├── variants
 ├── metadata
 └── brand/custom relationships
```

## Product Variant

```text
Product Variant
 ├── SKU
 ├── options
 ├── price
 ├── inventory item
 └── metadata
```

Products can have multiple variants.

Example:

```text
Vitamin C
 ├── 500mg / 60 capsules
 ├── 500mg / 120 capsules
 └── 1000mg / 60 capsules
```

Do not duplicate products simply because they have variants.

---

# 7. CUSTOMER / CART / ORDER FLOW

The intended commerce flow is:

```text
Customer
   |
   v
Browse Products
   |
   v
Product Details
   |
   v
Add to Cart
   |
   v
Cart
   |
   v
Checkout
   |
   +---- Customer / Guest
   |
   +---- Address
   |
   +---- Shipping
   |
   +---- Payment
   |
   v
Payment Collection / Payment Session
   |
   v
Order
   |
   +---- Payment
   |
   +---- Fulfillment
   |
   +---- Inventory effects
   |
   v
Shipment / Tracking
```

Both guest checkout and authenticated customer checkout are required for the MVP if confirmed by business requirements.

---

# 8. INVENTORY ARCHITECTURE

Inventory must remain compatible with Medusa's inventory model.

Conceptually:

```text
Product Variant
      |
      v
Inventory Item
      |
      v
Stock Location
      |
      v
Inventory Level
```

The project may eventually have multiple warehouses.

Do not immediately build a custom warehouse system unless required for MVP.

---

# 9. ODOO INTEGRATION

### Current architectural assumption

Odoo is an external system responsible primarily for inventory/stock availability unless the client explicitly defines additional Odoo ownership.

Before implementation, confirm:

- Is Odoo inventory-only?
- Is Odoo the source of truth for products?
- Is Odoo the source of truth for prices?
- Is Odoo the source of truth for orders?
- Is Odoo responsible for invoices/accounting?
- Are warehouses maintained in Odoo?
- Are suppliers maintained in Odoo?
- Is synchronization one-way or two-way?

### MVP assumption

If Odoo is inventory-only:

```text
Odoo
  |
  | Stock / availability
  v
Medusa Inventory
  |
  v
Next.js
```

Required integration concepts:

- SKU mapping
- Product mapping where necessary
- Stock availability
- Stock updates
- Out-of-stock handling
- Error/retry handling
- Synchronization logging

Never silently invent ownership rules.

---

# 10. PAYMOB INTEGRATION

Paymob is the payment provider.

Target flow:

```text
Customer
   |
   v
Next.js Checkout
   |
   v
Medusa
   |
   v
Paymob Payment Provider
   |
   v
Payment
   |
   v
Paymob Callback/Webhook
   |
   v
Medusa
   |
   v
Verified Payment State
```

Important rules:

1. Payment credentials stay server-side.
2. Do not trust the frontend to declare a payment successful.
3. Payment status must be verified server-side.
4. Webhooks must be handled safely.
5. Webhook processing must be idempotent.
6. Duplicate callbacks must not create duplicate payments/orders.
7. Failure, cancellation, expiration, and success states must be handled.
8. Refund behavior must be defined before implementing refunds.
9. COD is a different payment flow and must not be treated as a successful online payment.

---

# 11. BOSTA INTEGRATION

Bosta is the shipping/fulfillment provider.

Target flow:

```text
Medusa Order
     |
     v
Bosta Fulfillment Provider
     |
     v
Bosta Shipment
     |
     v
Tracking Number
     |
     v
Medusa Order / Fulfillment
     |
     v
Customer Tracking UI
```

Typical data:

- Customer name
- Phone
- Address
- Governorate
- Order reference
- COD amount where applicable
- Package information

Typical returned data:

- Shipment ID
- Tracking number
- Shipment status
- Delivery status
- Failure/return information

Map Bosta statuses into the application's order/fulfillment state carefully.

Do not hard-code assumptions about Bosta statuses without checking the current API documentation.

---

# 12. CUSTOM MODULES

Only build custom modules where Medusa core does not already provide the required functionality.

Potential custom modules:

```text
Custom
├── Brand
├── Loyalty
├── Supplier
├── Purchase Order
├── Warehouse
├── Batch / Lot
├── Expiry
├── Authenticity
├── Reviews
├── Egyptian Shipping
├── COD
├── Content / CMS
├── Search Management
├── Analytics
├── Fraud / Risk
└── Audit Log
```

### MVP custom-module priority

Start with only the custom functionality that is confirmed mandatory.

Likely MVP:

```text
Brand
Odoo Integration
Paymob Provider
Bosta Fulfillment Provider
```

Potentially:

```text
Loyalty
Reviews
```

only if explicitly required at launch.

Do not build the complete future architecture during the 4-week MVP.

---

# 13. BRAND ARCHITECTURE

If brands are required:

```text
Brand
 ├── id
 ├── name
 ├── slug
 ├── description
 ├── logo
 ├── country
 └── status

Brand
   |
   +---- Products
```

Use a custom Brand module rather than duplicating product records.

---

# 14. LOYALTY — PHASE 2 UNLESS REQUIRED

Potential model:

```text
Customer
   |
   v
Loyalty Account
   |
   +---- Points Balance
   |
   +---- Points Transactions
   |
   +---- Earn Rules
   |
   +---- Redemption Rules
```

Business rules still requiring client confirmation:

- Points per purchase
- Points from registration
- Points from reviews
- Expiration
- Redemption value
- Minimum redemption
- Refund reversal
- Coupon + loyalty stacking
- Admin adjustments
- Loyalty tiers

Do not invent these rules.

---

# 15. REVIEWS — PHASE 2 UNLESS REQUIRED

Potential functionality:

- Customer reviews
- Verified purchase
- Rating
- Review text
- Moderation
- Approval/rejection
- Review images
- Admin response
- Customer edit rules

Keep reviews independent from Medusa core product data and link them to products/customers/orders as required.

---

# 16. SEARCH

Search architecture:

```text
Next.js
   |
   v
Search API
   |
   v
Meilisearch
   |
   v
Product Search Index
```

Potential searchable fields:

- Product name
- SKU
- Brand
- Category
- Arabic name
- English name
- Description
- Relevant attributes

Potential filters:

- Category
- Brand
- Price
- Availability
- Rating

Postpone advanced search optimization until the core catalog works.

---

# 17. DATA OWNERSHIP

This is a critical architectural decision.

Before implementing integrations, explicitly define the source of truth for:

| Entity | Initial expected owner |
|---|---|
| Product | Medusa / client decision |
| Variant | Medusa |
| Price | Medusa / client decision |
| Customer | Medusa |
| Cart | Medusa |
| Order | Medusa |
| Payment status | Medusa + Paymob verification |
| Fulfillment | Medusa + Bosta |
| Inventory | Odoo if Odoo is inventory source of truth |
| Warehouse | Odoo or Medusa — must be confirmed |
| Supplier | Odoo or custom module — must be confirmed |
| Invoice/accounting | Odoo if required |
| Search index | Meilisearch |

Do not implement two competing sources of truth for the same entity without an explicit synchronization strategy.

---

# 18. API / FRONTEND COMMUNICATION

Correct architecture:

```text
Next.js
   |
   | HTTPS / API
   v
Medusa
   |
   +---- PostgreSQL
   +---- Redis
   +---- Odoo
   +---- Paymob
   +---- Bosta
   +---- Meilisearch
```

Avoid:

```text
Next.js ---> PostgreSQL
Next.js ---> Odoo
Next.js ---> Paymob secret API
Next.js ---> Bosta secret API
```

The frontend should communicate with the backend, not bypass the backend.

---

# 19. SECURITY RULES

Never expose:

- Database credentials
- JWT secrets
- Cookie secrets
- Odoo credentials
- Paymob secret credentials
- Bosta credentials
- Redis credentials
- Storage secret keys

Frontend environment variables must contain only values intended for the browser.

Validate all webhook requests where the provider supports verification.

Use HTTPS in production.

Use proper CORS configuration.

Never trust client-provided:

- Price
- Inventory availability
- Payment success
- Discount amount
- Order total

The server must calculate and validate authoritative commerce values.

---

# 20. ENVIRONMENT STRATEGY

Maintain separate environments:

```text
Development
     |
     v
Staging
     |
     v
Production
```

Use separate databases.

Never use production credentials locally.

Example backend environment:

```env
DATABASE_URL=
REDIS_URL=

STORE_CORS=
ADMIN_CORS=
AUTH_CORS=

JWT_SECRET=
COOKIE_SECRET=

ODOO_URL=
ODOO_CLIENT_ID=
ODOO_CLIENT_SECRET=

PAYMOB_API_KEY=
PAYMOB_SECRET=
PAYMOB_PUBLIC_KEY=

BOSTA_API_URL=
BOSTA_API_KEY=

MEILISEARCH_HOST=
MEILISEARCH_API_KEY=

STORAGE_ENDPOINT=
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=
```

Only define variables actually required by the installed integrations.

---

# 21. ERROR HANDLING

Every external integration must handle:

- Timeout
- Invalid credentials
- Rate limits
- Network failure
- Invalid response
- Duplicate webhook
- Partial failure
- Retry
- Logging
- Idempotency

External services must not be allowed to corrupt the commerce state.

Example:

```text
Paymob timeout
     |
     v
Payment = pending
     |
     v
Retry / verification
     |
     v
Confirmed status
```

Do not immediately mark a payment failed simply because one network request timed out.

---

# 22. IDEMPOTENCY

Idempotency is mandatory for:

- Payment callbacks
- Shipment creation
- Inventory synchronization
- Order synchronization
- Webhook processing

Example:

```text
Paymob webhook
      |
      v
Check transaction/reference
      |
      +---- Already processed → return safely
      |
      +---- New → process
```

The same external event must never create duplicate business records.

---

# 23. BACKGROUND JOBS

Use Medusa Worker / supported background processing for operations such as:

- Synchronization
- Search indexing
- External API retries
- Notifications
- Scheduled tasks
- Other long-running jobs

Do not block a customer HTTP request while performing unnecessary long-running external work.

---

# 24. LOGGING / OBSERVABILITY

Every integration should have useful structured logs.

At minimum capture:

```text
Timestamp
Operation
Provider
Internal ID
External ID
Request correlation ID
Status
Error category
Retry count
```

Never log secrets, passwords, payment credentials, or sensitive authentication tokens.

---

# 25. TESTING STRATEGY

Minimum testing layers:

### Unit

Test:

- Custom module logic
- Business rules
- Mapping functions
- Validation

### Integration

Test:

```text
Medusa ↔ PostgreSQL
Medusa ↔ Odoo
Medusa ↔ Paymob
Medusa ↔ Bosta
Medusa ↔ Meilisearch
```

### E2E

Test:

```text
Browse
→ Product
→ Cart
→ Checkout
→ Payment
→ Order
→ Inventory
→ Fulfillment
→ Tracking
```

Critical negative tests:

- Failed payment
- Cancelled payment
- Duplicate webhook
- Out-of-stock
- Invalid address
- Bosta API failure
- Odoo unavailable
- Network timeout
- Customer refresh during checkout

---

# 26. MVP DELIVERY PLAN

## Week 1 — Core commerce

```text
Medusa
PostgreSQL
Admin
Products
Categories
Variants
Pricing
Inventory
Customer
Cart
Checkout
Orders
Next.js ↔ Medusa
```

Goal:

**Product → Cart → Checkout → Order works.**

## Week 2 — Integrations

```text
Odoo
Paymob
Bosta
Brand
Basic promotions
```

Goal:

**Real external business systems work end-to-end.**

## Week 3 — Storefront completion

```text
Homepage
Product listing
Product details
Categories
Search
Cart
Checkout
Authentication
Account
Orders
Tracking
```

Goal:

**Customer-facing storefront is connected to the real backend.**

## Week 4 — Production readiness

```text
Integration tests
E2E tests
Security
Bug fixing
Monitoring
Backups
Cloudflare
Coolify
Hetzner
Production deployment
```

Goal:

**Stable production MVP.**

---

# 27. PHASE 2

Do not implement these during the MVP unless contractually required:

- Advanced loyalty
- Supplier management
- Purchase orders
- Advanced warehouse management
- Batch/lot management
- Expiry/FEFO
- Advanced review system
- Advanced CMS
- AI recommendations
- Advanced analytics
- Fraud/risk engine
- Multiple payment providers
- Multiple shipping providers
- Mobile applications
- Advanced marketing automation

---

# 28. DEVELOPMENT ORDER

The agent MUST generally follow this sequence:

```text
1. Medusa stability
       ↓
2. PostgreSQL
       ↓
3. Admin
       ↓
4. Product / Category / Variant
       ↓
5. Next.js ↔ Medusa
       ↓
6. Customer
       ↓
7. Cart
       ↓
8. Checkout
       ↓
9. Order
       ↓
10. Brand
       ↓
11. Odoo
       ↓
12. Paymob
       ↓
13. Bosta
       ↓
14. Search
       ↓
15. Additional business features
       ↓
16. Testing
       ↓
17. Production
```

Do not skip directly to advanced custom functionality before the core commerce flow works.

---

# 29. AGENT RULES

Any development agent working on this project must follow these rules:

### Rule 1
**Read this document before making architectural changes.**

### Rule 2
Do not modify Medusa core source code.

### Rule 3
Do not create a custom implementation of a Medusa capability without first checking whether Medusa already provides it.

### Rule 4
Do not introduce a new database, service, framework, library, or architectural layer without explaining why it is necessary.

### Rule 5
Do not move business logic into Next.js simply because it is easier.

### Rule 6
Do not expose third-party credentials to the frontend.

### Rule 7
Do not trust frontend prices, inventory, payment status, discounts, or totals.

### Rule 8
External integrations must be idempotent and retry-safe.

### Rule 9
Do not duplicate the same source of truth across Odoo and Medusa without a synchronization contract.

### Rule 10
Do not build Phase-2 functionality during the 4-week MVP unless the project owner explicitly approves it.

### Rule 11
Before implementing an uncertain business rule, identify the ambiguity and ask for confirmation rather than inventing behavior.

### Rule 12
Prefer the simplest architecture that satisfies the confirmed requirement.

### Rule 13
Keep custom code modular and independently testable.

### Rule 14
Do not make breaking architectural changes without documenting the reason and impact.

### Rule 15
After completing a significant architectural change, update this document if the architecture itself has changed.

---

# 30. ARCHITECTURAL DECISION CHECKLIST

Before adding anything, ask:

1. Does Medusa already provide this?
2. Is this an MVP requirement?
3. Which system owns the data?
4. Does this belong in Next.js or Medusa?
5. Does it require a custom module?
6. Does it require a provider?
7. Does it require a workflow?
8. Does it require a background job?
9. Does it require Redis?
10. Does it require PostgreSQL persistence?
11. Does it require an external integration?
12. How will failures be handled?
13. How will retries work?
14. How will idempotency work?
15. How will it be tested?
16. Does this introduce unnecessary complexity?

---

# 31. CURRENT TARGET

The first technical milestone is NOT the complete platform.

The first milestone is:

```text
Next.js
   |
   v
Medusa
   |
   v
PostgreSQL

Product
   ↓
Category
   ↓
Variant
   ↓
Cart
   ↓
Checkout
   ↓
Order
```

Once this is stable:

```text
             +--> Odoo
             |
Next.js --> Medusa --> Paymob
             |
             +--> Bosta
             |
             +--> Meilisearch
```

This is the foundation on which the remaining functionality should be built.


---

# 32. ENGINEERING QUALITY STANDARD — CLEAN ARCHITECTURE, SOLID, PERFORMANCE, SCALABILITY, MAINTAINABILITY

This section is **mandatory**. All backend implementation and architectural decisions must follow these engineering principles.

The system must not only functionally work; it must be designed so that the codebase remains understandable, testable, performant, scalable, and maintainable as the catalog, traffic, integrations, and business complexity grow.

## 32.1 Clean Architecture

The backend should separate business rules from frameworks, infrastructure, and external services.

Use the following conceptual separation:

```text
                 +---------------------------+
                 |      Presentation         |
                 | API Routes / Controllers  |
                 +-------------+-------------+
                               |
                               v
                 +---------------------------+
                 |      Application          |
                 | Use Cases / Workflows     |
                 | Orchestration / DTOs      |
                 +-------------+-------------+
                               |
                               v
                 +---------------------------+
                 |          Domain           |
                 | Business Rules / Models   |
                 | Policies / Interfaces    |
                 +-------------+-------------+
                               |
                               v
                 +---------------------------+
                 |       Infrastructure      |
                 | DB / Medusa / Providers   |
                 | Odoo / Paymob / Bosta    |
                 | Redis / Search / Storage |
                 +---------------------------+
```

### Dependency direction

Dependencies should point inward toward business rules.

```text
Presentation
     ↓
Application
     ↓
Domain
     ↑
Infrastructure implements interfaces
```

The domain/application layer must not become tightly coupled to:

- HTTP
- Express/framework-specific request objects
- PostgreSQL implementation details
- Redis
- Odoo SDK/API details
- Paymob API details
- Bosta API details
- Meilisearch
- Next.js

Where Medusa's architecture imposes framework boundaries, follow Medusa's official extension model while preserving the same separation of concerns inside custom code.

---

## 32.2 SOLID PRINCIPLES

### Single Responsibility Principle

Each class/module/function should have one clear responsibility.

Bad:

```text
OrderService
 ├── creates orders
 ├── calls Paymob
 ├── calls Bosta
 ├── updates Odoo
 ├── sends emails
 └── calculates loyalty
```

Prefer:

```text
OrderService
PaymentService
FulfillmentService
InventorySyncService
NotificationService
LoyaltyService
```

with orchestration performed by an appropriate application workflow/use case.

### Open/Closed Principle

The system should be extensible without repeatedly modifying stable core logic.

For example:

```text
PaymentProvider
    |
    +---- Paymob
    +---- Future Provider
```

and:

```text
FulfillmentProvider
    |
    +---- Bosta
    +---- Future Courier
```

Adding another provider should not require rewriting the checkout domain.

### Liskov Substitution Principle

Implementations of an abstraction must honor the contract expected by the application.

A new payment or shipping provider must behave according to the provider interface rather than introducing provider-specific assumptions into generic business logic.

### Interface Segregation Principle

Do not create giant interfaces.

Prefer focused contracts:

```text
PaymentGateway
PaymentVerifier
ShipmentCreator
ShipmentTracker
InventoryProvider
SearchProvider
```

when the responsibilities genuinely differ.

### Dependency Inversion Principle

Business/application logic should depend on abstractions, not concrete external services.

Example:

```text
Application
    |
    v
PaymentGateway
    |
    +---- PaymobAdapter
```

not:

```text
Application
    |
    v
PaymobClient
```

The same principle applies to Odoo, Bosta, search, storage, email, and other external services.

---

# 33. DOMAIN-DRIVEN ORGANIZATION

Organize custom backend functionality around business capabilities rather than technical dumping grounds.

Prefer:

```text
modules/
├── brand/
├── loyalty/
├── reviews/
├── inventory-integration/
├── payment/
├── fulfillment/
└── search/
```

over:

```text
services/
├── everything.ts
└── helpers.ts
```

Within a custom capability, keep responsibilities explicit:

```text
brand/
├── domain/
├── application/
├── infrastructure/
├── api/
└── tests/
```

The exact directory structure may adapt to Medusa's required module conventions, but the separation of responsibilities must remain.

---

# 34. USE CASE / WORKFLOW THINKING

Business operations should be modeled as explicit use cases or Medusa workflows where appropriate.

Examples:

```text
CreateOrder
ProcessPayment
ConfirmPayment
CreateShipment
SyncInventory
HandlePaymentWebhook
HandleShipmentWebhook
UpdateProductStock
```

A use case should orchestrate the operation rather than becoming a giant class containing every implementation detail.

Example:

```text
ProcessCheckout
   |
   +--> ValidateCart
   +--> CalculateTotals
   +--> ValidateInventory
   +--> CreatePaymentSession
   +--> CompleteOrder
   +--> TriggerFulfillment
```

Use Medusa workflows and transactions where appropriate instead of manually chaining database mutations in controllers.

---

# 35. CONTROLLERS / API ROUTES

Controllers/API routes should remain thin.

They should primarily:

```text
HTTP Request
    ↓
Validate / parse input
    ↓
Call application use case/workflow
    ↓
Map result
    ↓
HTTP Response
```

They should NOT contain:

- Complex business rules
- Large SQL queries
- Payment provider logic
- Shipping provider logic
- Inventory synchronization logic
- Large data transformations
- Multiple unrelated responsibilities

---

# 36. DOMAIN RULES

Business rules must live in the appropriate application/domain layer rather than being duplicated across:

- Controllers
- Frontend
- Webhooks
- Background jobs
- Provider implementations

For example, order-total validation should have one authoritative backend implementation.

The frontend may display totals, but the backend must recalculate/validate them.

---

# 37. DTO AND VALIDATION RULES

Do not pass raw external-provider objects throughout the application.

Use explicit DTOs/mappers.

Example:

```text
PaymobResponse
       ↓
PaymobMapper
       ↓
InternalPaymentResult
       ↓
Application
```

Likewise:

```text
BostaResponse
       ↓
BostaMapper
       ↓
InternalShipmentResult
       ↓
Application
```

External API models must not leak throughout the domain.

Validate incoming:

- API requests
- Webhooks
- External API responses where appropriate
- Configuration
- Business inputs

---

# 38. ERROR HANDLING ARCHITECTURE

Use meaningful error categories rather than generic errors.

Conceptually:

```text
DomainError
ApplicationError
ValidationError
IntegrationError
InfrastructureError
AuthenticationError
AuthorizationError
```

External provider failures should be translated into internal application errors.

Do not expose raw provider errors to customers.

Customer response:

```text
Payment could not be completed.
```

Internal logs:

```text
PaymentProviderError
provider=paymob
transaction_id=...
correlation_id=...
reason=...
```

---

# 39. DATABASE / PERSISTENCE PRINCIPLES

PostgreSQL is the primary persistent store.

Rules:

- Use indexes intentionally.
- Do not index every column automatically.
- Analyze high-frequency queries.
- Avoid N+1 queries.
- Fetch only required fields where appropriate.
- Use pagination for large collections.
- Use transactions for atomic business operations.
- Keep database constraints where they protect business invariants.
- Avoid unnecessary joins across high-volume paths.
- Avoid loading entire product catalogs into memory.
- Do not use the database as a general-purpose cache.
- Do not store derived data unless there is a clear reason.
- Use migrations for schema changes.
- Never manually edit production schema.

For high-volume tables, consider:

```text
Indexes
Pagination
Query optimization
Archival strategy
Partitioning only when justified
```

Do not prematurely introduce database partitioning.

---

# 40. PERFORMANCE PRINCIPLES

Performance must be considered during design, not after the application becomes slow.

### API performance

- Keep synchronous request paths short.
- Avoid unnecessary external API calls during customer requests.
- Cache stable/read-heavy data where appropriate.
- Use pagination.
- Avoid N+1 queries.
- Avoid returning unnecessary payloads.
- Use appropriate database indexes.
- Use background jobs for expensive non-critical operations.

### Product/catalog performance

The catalog may grow to thousands or potentially tens of thousands of SKUs.

Therefore:

```text
Do NOT:
load every product
into memory
for every request.
```

Use:

- Pagination
- Search indexing
- Filtering at the data/search layer
- Proper caching
- Efficient queries

### Checkout performance

The checkout path is business-critical.

Minimize unnecessary calls:

```text
Customer
   ↓
Cart validation
   ↓
Price/inventory validation
   ↓
Payment
```

Do not call unrelated systems synchronously unless the business process requires it.

---

# 41. CACHING STRATEGY

Redis should be used intentionally.

Good candidates:

- Frequently accessed stable data
- Expensive read results
- Temporary state
- Rate limiting where required
- Supported Medusa job/workflow functionality

Do NOT blindly cache:

- Payment state without a source-of-truth strategy
- Inventory values that must be authoritative
- Order state without invalidation rules

Caching must define:

```text
What is cached?
TTL?
Invalidation trigger?
Source of truth?
What happens if cache is unavailable?
```

The application must remain correct if the cache is empty.

---

# 42. SCALABILITY PRINCIPLES

Design the application so that the stateless application layer can scale horizontally.

Target:

```text
                 Load / Edge
                     |
              +------+------+
              |             |
          Next.js A      Next.js B
              |             |
              +------+------+
                     |
              +------+------+
              |             |
          Medusa A       Medusa B
              |             |
              +------+------+
                     |
             Managed PostgreSQL
                     |
                   Redis
```

Do not store critical application state only in process memory.

Avoid designs that require one specific server instance.

Use shared external systems for state that must survive process restarts.

---

# 43. ASYNCHRONOUS PROCESSING

Use background workers for work that does not need to block the customer request.

Good candidates:

- Odoo synchronization
- Search indexing
- Retryable external API calls
- Notifications
- Non-critical analytics events
- Periodic synchronization
- Long-running processing

Customer-critical operations should still have clear transactional boundaries.

---

# 44. RESILIENCE

External systems can fail.

The architecture must tolerate:

```text
Odoo unavailable
Paymob unavailable
Bosta unavailable
Meilisearch unavailable
Redis unavailable
Network timeout
Provider rate limit
```

For each integration define:

```text
Timeout
Retry policy
Backoff
Maximum retries
Idempotency
Fallback behavior
Logging
Alerting
Recovery
```

Never create infinite retries.

Do not retry non-idempotent operations without an idempotency mechanism.

---

# 45. RATE LIMITING

Rate-limit public APIs and sensitive operations where appropriate.

Especially consider:

- Login
- OTP
- Password/reset flows
- Checkout
- Payment initiation
- Webhooks
- Search
- Public API endpoints

Do not use rate limiting as a substitute for authentication/authorization.

---

# 46. SECURITY AND SEPARATION OF TRUST

Treat every external system and client as untrusted input.

Validate:

```text
Frontend input
External webhooks
Odoo responses
Paymob responses
Bosta responses
Uploaded files
Query parameters
```

Authorization must be enforced server-side.

Do not rely on the frontend hiding admin functionality.

---

# 47. MAINTAINABILITY

Code should optimize for future developers being able to understand and modify it.

Rules:

- Prefer clear names over clever abstractions.
- Keep functions focused.
- Avoid giant services.
- Avoid circular dependencies.
- Avoid duplicated business rules.
- Avoid hidden side effects.
- Keep provider-specific code isolated.
- Document non-obvious architectural decisions.
- Write tests for important business rules.
- Keep configuration centralized and typed/validated.
- Remove dead code.
- Avoid premature abstractions.

A simple solution that satisfies the requirement is preferred over a complicated "future-proof" abstraction.

---

# 48. OBSERVABILITY AND CORRELATION

Every important request should be traceable across services.

Use a correlation/request ID where practical:

```text
Customer Request
   |
   v
Medusa
   |
   +--> Paymob
   +--> Odoo
   +--> Bosta
```

Logs should make it possible to follow one order/payment/shipment through the system.

Example identifiers:

```text
request_id
order_id
payment_id
shipment_id
external_reference
```

Never log secrets or sensitive payment data.

---

# 49. TESTABILITY

Architecture must make important components independently testable.

For business logic:

```text
Use Case
   |
   +--> Mock PaymentGateway
   +--> Mock InventoryProvider
   +--> Mock FulfillmentProvider
```

This allows tests without calling real external services.

Integration tests should separately test the real provider adapters in a test/sandbox environment when available.

---

# 50. DEPENDENCY MANAGEMENT

Before adding a package:

1. Check whether the existing stack already provides the capability.
2. Check whether Medusa already provides it.
3. Check package maintenance and compatibility.
4. Check security implications.
5. Check bundle/runtime cost.
6. Check whether it introduces duplicate functionality.

Do not add dependencies merely for convenience.

---

# 51. ARCHITECTURAL TRADE-OFF RULE

Do not over-engineer the MVP.

The architecture should be:

```text
Clean
+
Simple
+
Testable
+
Scalable enough
+
Easy to extend
```

It should NOT become:

```text
Microservices everywhere
+
Multiple databases
+
Event bus
+
Complex distributed transactions
+
Unnecessary abstractions
```

unless actual requirements justify them.

For the 4-week MVP, a modular Medusa backend is preferred over prematurely splitting the application into many independent services.

---

# 52. PERFORMANCE / SCALABILITY / MAINTAINABILITY CHECKPOINT

Before considering a feature complete, the agent should ask:

### Clean Architecture
- Are responsibilities separated?
- Are dependencies pointing in the correct direction?
- Is business logic independent of infrastructure?

### SOLID
- Does each component have one clear responsibility?
- Can providers be replaced?
- Are interfaces focused?
- Does application logic depend on abstractions?

### Performance
- Is the database query efficient?
- Is there an N+1 problem?
- Is pagination implemented?
- Are unnecessary API calls avoided?
- Can expensive work be asynchronous?

### Scalability
- Does the design work with more products?
- More orders?
- More customers?
- More traffic?
- Multiple application instances?

### Maintainability
- Is the code easy to understand?
- Is provider-specific logic isolated?
- Are business rules centralized?
- Are important behaviors tested?

### Reliability
- What happens if an external service fails?
- Is the operation retry-safe?
- Is it idempotent?
- Can the system recover?

---

# 53. NON-NEGOTIABLE ENGINEERING STANDARD

The agent must never optimize only for "making the feature work."

Every implementation must consider:

```text
Correctness
    +
Clean Architecture
    +
SOLID
    +
Security
    +
Performance
    +
Scalability
    +
Maintainability
    +
Testability
    +
Observability
```

If there is a conflict between a quick implementation and a structurally sound implementation, the agent should choose the simplest structurally sound implementation that still fits the MVP deadline.

If a shortcut is intentionally taken because of the 4-week MVP, document it as a technical-debt decision and avoid making the shortcut foundational to the architecture.

---

## Final principle

Treat the project as a **Medusa-based commerce platform with custom business extensions**, not as a generic backend being rebuilt from scratch.

Use Medusa for commerce primitives.

Use custom Medusa modules/providers/workflows for project-specific functionality.

Use Next.js for the customer experience.

Use Odoo, Paymob, and Bosta through backend integrations.

Keep PostgreSQL as the persistent database, Redis for supported asynchronous/cache/workflow needs, Meilisearch for search, and object storage for media.

Keep the MVP small enough to ship in four weeks while preserving clean extension points for Phase 2.
