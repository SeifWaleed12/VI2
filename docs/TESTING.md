# Testing Reference

## Principle

Test business behavior and system boundaries, not implementation details merely for coverage.

Every behavior change must add/update relevant tests.

## Unit

Test:
- Business rules
- Validation
- Mapping
- Domain policies
- Custom module logic
- Workflow decisions

Mock external providers where appropriate.

## Integration

Test:
- Medusa ↔ PostgreSQL
- Custom modules
- Medusa ↔ Odoo
- Medusa ↔ Paymob
- Medusa ↔ Bosta
- Medusa ↔ Meilisearch

## E2E

Critical flow:

```text
Browse
  ↓
Product
  ↓
Cart
  ↓
Checkout
  ↓
Payment
  ↓
Order
  ↓
Inventory
  ↓
Fulfillment
  ↓
Tracking
```

## Negative Cases

Where applicable:
- Failed payment
- Cancelled payment
- Duplicate webhook
- Out-of-stock
- Invalid address
- Provider failure
- Odoo unavailable
- Network timeout
- Customer refresh during checkout
- Repeated submission
- Unauthorized resource access

## Test Integrity

Never:
- Delete tests to make a feature pass
- Weaken assertions without a reason
- Skip critical security tests
- Mock away the behavior actually being tested

If a test is wrong, fix it and document why.

## Validation

Use repository-configured commands for unit, integration, E2E, type, lint, and build checks.

If validation cannot run, report exactly what was not run, why, and what was verified instead.
