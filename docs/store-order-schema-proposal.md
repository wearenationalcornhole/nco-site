# Store Order Schema Proposal

The current Prisma schema does not include any store-specific tables for carts, orders, or payment records. Because of that, the Store MVP uses a local cart and Stripe Checkout, but it does not persist completed orders in the database.

## Current Limitation

- No Prisma models exist for store orders.
- No Prisma models exist for store order line items.
- No payment status or fulfillment status fields exist for store purchases.

## Recommended Migration

Add two Prisma models first:

```prisma
model store_orders {
  id                 String   @id @default(cuid())
  stripe_session_id  String   @unique
  stripe_payment_id  String?
  email              String?
  status             String   @default("paid")
  currency           String   @default("usd")
  subtotal_amount    Int
  total_amount       Int
  created_at         DateTime @default(now())
  updated_at         DateTime @updatedAt
  items              store_order_items[]
}

model store_order_items {
  id          String       @id @default(cuid())
  order_id     String
  product_slug String
  title        String
  unit_amount  Int
  quantity     Int
  order        store_orders @relation(fields: [order_id], references: [id], onDelete: Cascade)
}
```

## Recommended Webhook Persistence Flow

1. Receive `checkout.session.completed` on `/api/stripe/webhook`.
2. Verify the event signature with `STRIPE_WEBHOOK_SECRET`.
3. Expand or retrieve the session line items from Stripe.
4. Upsert the order by `stripe_session_id`.
5. Insert related `store_order_items`.
6. Add optional fulfillment fields later if shipping or internal handling is needed.

## Why Defer This In The MVP

The current request explicitly avoids assuming schema changes. Persisting orders before a reviewed migration would add risk to a codebase that already has mixed Supabase and Prisma usage. The safe path is:

1. Ship the storefront and Stripe Checkout flow first.
2. Review and approve the Prisma migration.
3. Enable webhook persistence after the schema exists.
