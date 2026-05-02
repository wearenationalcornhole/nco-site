# Admin Ops Readiness

This phase adds an admin overview that exposes the current runtime shape of the platform without requiring new database tables first.

## What the admin overview shows

- role counts for players, organizers, and admins
- event and registration totals
- store catalog totals
- environment readiness for Supabase, Prisma, and Stripe
- recent event registrations
- recent Stripe Checkout sessions when `STRIPE_SECRET_KEY` is configured

## What it does not solve yet

- durable store order persistence
- durable event payment state persistence
- external log shipping or alerting

Those still require the reviewed schema proposals already added in:

- `docs/store-order-schema-proposal.md`
- `docs/event-registration-payment-schema-proposal.md`

## Recommended next ops step

1. Approve and apply the order/payment schema migrations.
2. Persist Stripe webhook results instead of only surfacing recent sessions live.
3. Add error/event logging to a real sink so admin activity and failed webhooks are searchable.
