# Production Rollout Validation Checklist

This phase turns the admin console into the operational control point for the current launch stack.

It adds Stripe webhook delivery logging, admin-visible webhook failures, and a manual retry path for retryable failed store and event-registration webhook deliveries.

## Required database tables

Apply the Prisma migration that creates all launch-critical persistence tables:

- `store_products`
- `store_product_images`
- `store_orders`
- `store_order_items`
- `event_registration_payments`
- `payment_action_audit_logs`
- `webhook_delivery_logs`

## Environment validation

1. Confirm the deployed environment has:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE` or `SUPABASE_SERVICE_ROLE_KEY`
   - `DATABASE_URL`
   - `DIRECT_URL`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `NEXT_PUBLIC_SITE_URL` or `APP_ORIGIN`
2. Confirm `/portal/admin` shows all readiness rows as ready except any integrations you intentionally have disabled.
3. Confirm `/portal/admin` shows webhook log persistence as enabled after the migration is applied.

## Stripe webhook validation

1. Confirm the store webhook in Stripe points to `/api/stripe/webhook`.
2. Confirm the paid event registration webhook in Stripe points to `/api/stripe/event-registration-webhook`.
3. Trigger a test store checkout and verify:
   - the checkout completes
   - a `store_orders` record is created
   - the order appears under `/portal/orders`
   - the order appears in `/portal/admin`
   - a processed webhook delivery log appears in `/portal/admin`
4. Trigger a paid event registration and verify:
   - the checkout completes
   - the registration record exists
   - an `event_registration_payments` record exists
   - the registration appears under `/portal/my-registrations`
   - the payment appears in `/portal/orders`
   - a processed webhook delivery log appears in `/portal/admin`

## Failure-handling validation

1. Temporarily simulate a failed webhook persistence path in a non-production environment.
2. Confirm the failure appears in `/portal/admin` under webhook delivery health.
3. If the failed row is retryable, use the admin retry action and verify:
   - a new manual retry log is created
   - the retry result is visible in webhook delivery health
   - the related business record is persisted correctly after retry
   - a payment action audit entry is created for the retry action

## Final launch QA

1. Verify public routes:
   - `/`
   - `/events`
   - `/shop`
   - `/community`
   - `/clubs`
2. Verify authenticated routes:
   - `/portal/dashboard`
   - `/portal/my-registrations`
   - `/portal/orders`
   - `/portal/profile`
3. Verify admin routes:
   - `/portal/admin`
   - `/portal/admin/store`
4. Verify organizer flows:
   - event CRUD
   - registrant visibility
   - payment status visibility
   - refund/cancel workflow for staff-operated assistance
