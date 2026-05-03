# Admin Ops Readiness

This phase adds an admin overview that exposes the current runtime shape of the platform without requiring new database tables first.

The follow-up persistence phase adds Prisma models for durable store orders and event registration payments. Those tables still need to be migrated into each deployed database before production should rely on them.

## What the admin overview shows

- role counts for players, organizers, and admins
- event and registration totals
- store catalog totals
- persisted store order and paid-event payment totals
- environment readiness for Supabase, Prisma, and Stripe
- recent event registrations
- recent Stripe Checkout sessions when `STRIPE_SECRET_KEY` is configured

The payment-reporting pass also adds:

- `/portal/orders` for signed-in users to review store orders and paid event registration history
- organizer payment summaries inside event registrant lists

The store-admin management pass also adds:

- `/portal/admin/store` for admin-managed product catalog operations
- runtime support for durable `store_products` and `store_product_images` tables with safe fallback behavior until those tables exist

The production rollout observability pass also adds:

- durable `webhook_delivery_logs` for Stripe store and event-registration webhook processing
- admin-visible webhook delivery health and manual retry support for retryable failed deliveries

The refund/cancellation pass adds:

- admin refund actions for persisted store orders
- admin or organizer refund/cancel actions for persisted event registration payments
- status-aware totals so refunded records no longer count toward active revenue

## What it does not solve yet

- applying the database migration for `store_orders`, `store_order_items`, and `event_registration_payments`
- applying the database migration for `store_products` and `store_product_images` if you want admin-managed catalog changes to persist outside the in-memory fallback
- applying the database migration for `webhook_delivery_logs` if you want durable Stripe webhook diagnostics and retry history
- external log shipping or alerting

The schema direction for the order and payment tables is already captured in:

- `docs/store-order-schema-proposal.md`
- `docs/store-catalog-rollout-checklist.md`
- `docs/event-registration-payment-schema-proposal.md`
- `docs/payment-migration-rollout-checklist.md`
- `docs/production-rollout-validation-checklist.md`

## Recommended next ops step

1. Apply the Prisma schema changes in each environment before expecting durable order or payment history.
2. Add error/event logging to a real sink so admin activity and failed webhooks are searchable.
3. Add a true audit table if you need immutable refund/cancellation actor history beyond the current status fields and Stripe metadata.
