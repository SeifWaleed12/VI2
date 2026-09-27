# Security Reference

## Trust Boundary

Treat browsers, customer input, external providers, webhooks, and third-party APIs as untrusted boundaries.

Security is enforced server-side.

## Secrets

Never expose or commit:
- Database credentials
- JWT secrets
- Cookie/session secrets
- Odoo credentials
- Paymob secrets
- Bosta credentials
- Redis credentials
- Storage private keys
- Private API keys

Only intentionally public values may be browser-exposed.

Never log secrets.

## Authentication

Use Medusa authentication capabilities when they satisfy the requirement.

Do not create a parallel authentication system without a confirmed requirement.

Follow the project's selected session/authentication strategy consistently.

Authentication establishes identity; authorization establishes access.

## Authorization

Enforce authorization server-side.

Customer resources must be scoped to the authenticated customer.

Admin operations require appropriate admin authentication/authorization.

Never accept a client-supplied customer ID as proof of ownership.

## Commerce Trust

Never trust client-provided:
- Prices
- Inventory
- Discounts
- Shipping costs
- Order totals
- Payment success
- Resource ownership

Backend logic is authoritative.

## Webhooks

Verify authenticity/signatures where supported.

Validate payloads, make handlers idempotent, safely handle duplicates/unknown events, and prevent duplicate payment/order/shipment effects.

## Input Validation

Validate API inputs, query/path parameters, webhooks, configuration, business inputs, and external responses where appropriate.

Frontend validation is UX, not security.

## Browser Security

Use HTTPS in production, deliberate CORS, secure cookie configuration where applicable, appropriate CSRF protections for applicable cookie-authenticated state-changing endpoints, and appropriate security headers.

Do not store sensitive long-lived credentials in localStorage when a secure server-managed strategy is appropriate.

## Payments

Payment credentials remain server-side.

Never mark payment successful because the browser says it succeeded.

A timeout is an indeterminate state until verified; it is not automatically failure.

## Logging

Never log passwords, secrets, authentication tokens, private API keys, or sensitive payment data.

Use safe internal IDs and correlation IDs for diagnostics.

## Rate Limiting

Use rate limiting where abuse is realistically possible, especially authentication/OTP flows, password/reset flows, expensive public APIs, and relevant webhook endpoints.

Do not add rate limiting blindly to every endpoint.
