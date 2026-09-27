# MVP Scope

## Goal

Deliver a secure, maintainable core e-commerce MVP.

Core milestone:

```text
Product
  ↓
Cart
  ↓
Checkout
  ↓
Order
```

## Core First

```text
Medusa
  ↓
PostgreSQL
  ↓
Admin
  ↓
Products / Categories / Variants
  ↓
Next.js ↔ Medusa
  ↓
Customer
  ↓
Cart
  ↓
Checkout
  ↓
Order
```

Then integrate confirmed requirements such as:

```text
Odoo
Paymob
Bosta
Search
Additional confirmed features
Testing
Production readiness
```

## Out of Scope Unless Explicitly Requested

- Advanced loyalty
- Supplier management
- Purchase orders
- Advanced warehouse management
- Batch/lot/expiry/FEFO
- Advanced reviews
- Advanced CMS
- AI recommendations
- Advanced analytics
- Fraud/risk engine
- Multiple payment providers
- Multiple shipping providers
- Mobile apps
- Advanced marketing automation

Do not implement Phase-2 functionality unless explicitly requested.

The MVP timeline never justifies skipping security, tests, architectural boundaries, or inventing business rules.
