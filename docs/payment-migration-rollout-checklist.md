# Payment Migration Rollout Checklist

Use this when promoting the payment persistence stack to a deployed environment.

## Database

1. Apply the Prisma schema changes for:
   - `store_orders`
   - `store_order_items`
   - `event_registration_payments`
   - `payment_action_audit_logs`
2. Run Prisma client generation after the migration is applied.
3. Verify the new tables exist before enabling admin reliance on persisted payment history.

## Environment

1. Confirm `DATABASE_URL` and `DIRECT_URL` point to the same target database you migrated.
2. Confirm `STRIPE_SECRET_KEY` is present.
3. Confirm `STRIPE_WEBHOOK_SECRET` is present.
4. Confirm `NEXT_PUBLIC_SITE_URL` or `APP_ORIGIN` is set to the correct deployed origin.

## Stripe

1. Verify the store webhook points to `/api/stripe/webhook`.
2. Verify the paid event webhook points to `/api/stripe/event-registration-webhook`.
3. Trigger a test checkout and confirm:
   - the order or payment record persists
   - the admin overview updates
   - the portal order history updates

## Support Operations

1. Verify admin users can refund persisted store orders.
2. Verify organizer/admin users can refund or cancel event payment records for events they manage.
3. Verify refund/cancel actions appear in the audit history after execution.
4. Verify refunded records no longer count toward active revenue totals.

## Post-Deploy Sanity Check

1. Open `/portal/admin` and confirm:
   - persistence readiness is enabled
   - recent payment actions are visible
   - store and event totals look reasonable
2. Open an organizer-managed event and confirm:
   - payment summary cards render
   - recent payment actions render
