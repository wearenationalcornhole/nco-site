# Event Registration Payment Schema Proposal

The current runtime can support paid event registration only in a minimal way:
- Stripe Checkout creates the payment
- the webhook creates the registration after successful payment
- the existing `registrations` table remains the only durable event-entry record

This is safe for rollout, but it does **not** provide durable payment state, audit history, or organizer visibility into pending or failed checkouts.

## Recommended additions

Add event payment configuration fields:
- `events.registration_mode` (`free` or `paid`)
- `events.registration_price_cents`
- `events.registration_currency`

Add a payment-intent tracking table, for example `event_registration_payments`:
- `id`
- `event_id`
- `user_id`
- `registration_id` nullable until payment completes
- `stripe_checkout_session_id`
- `stripe_payment_intent_id`
- `amount_cents`
- `currency`
- `status` (`pending`, `paid`, `failed`, `refunded`, `expired`)
- `created_at`
- `updated_at`

Optional registration lifecycle fields:
- `registrations.payment_status`
- `registrations.payment_completed_at`

## Why this should exist

Without these additions, the app cannot reliably answer:
- which users started but did not finish payment
- which registrations were paid vs free
- whether a registration was refunded
- how much revenue an event generated
- what an organizer should do with incomplete or failed payment attempts

## Recommended rollout

1. Merge the current paid-registration groundwork first.
2. Add the schema migration above.
3. Move event pricing out of code config and into the `events` table.
4. Persist checkout/payment lifecycle records from the webhook.
5. Surface payment state in organizer and player registration views.
