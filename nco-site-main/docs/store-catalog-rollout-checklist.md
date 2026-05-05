# Store Catalog Rollout Checklist

This phase adds admin-managed store catalog operations at `/portal/admin/store`.

The storefront, cart, checkout product lookup, sitemap, and admin totals now read from the managed catalog layer. The code safely falls back to the seeded in-memory catalog until the new tables exist in the deployed database.

## Required database tables

- `store_products`
- `store_product_images`

These models are defined in `prisma/schema.prisma` and must be migrated into each deployed database before admins should rely on catalog edits as durable production data.

## Rollout steps

1. Apply the Prisma migration that creates `store_products` and `store_product_images`.
2. Run `prisma generate` in the deployment/build environment after the schema update.
3. Confirm `/portal/admin/store` loads for admin users and rejects non-admin users.
4. Create a test product and verify it appears on:
   - `/shop`
   - `/shop/[slug]`
   - the Stripe checkout session payload
   - `sitemap.xml`
5. Archive the test product and verify it disappears from public store routes while remaining visible in admin management.
6. If using Supabase Storage or another CDN for product images, confirm the final image URLs are public and stable.

## Operational notes

- Until the new tables exist, the app falls back to the seeded catalog so the public store remains functional.
- Catalog changes made through `/portal/admin/store` are only durable when the new tables exist in the target database.
- This phase does not add inventory decrementing, fulfillment workflows, or shipping/tax logic.
