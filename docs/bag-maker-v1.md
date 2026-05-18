# Bag Maker V1

## Scope

Bag Maker V1 is an organizer and admin tool in the portal.

It is intentionally template-based:

- no freeform Canva-style positioning
- fixed logo zones
- fixed 4 inch by 4 inch main placement area
- guided layouts only
- output focused on production PNGs plus one approval proof

## Output Files

- `slow-side-production.png`
- `fast-side-production.png`
- `customer-proof.png`

Production art requirements:

- 7.5 inch by 7.5 inch square
- 300 DPI
- exact output size `2250 x 2250`
- RGB PNG output
- organizer logo in top-left when enabled
- locked NCO logo in bottom-right
- no preview guide lines or yellow placement guides exported

Proof requirements:

- suggested size `1600 x 1000`
- slow side on the left
- fast side on the right
- labels under each bag
- organizer logo centered at the bottom when present

## Geometry

Shared geometry lives in [app/lib/bagMakerConfig.ts](/Users/gregoryortegae/Documents/Cornhole/NCO/CodexNCOwebsiteMay26/app/lib/bagMakerConfig.ts).

Key values:

- bag art size: `2250`
- main placement zone: `1200 x 1200`
- organizer logo zone: top-left approximate
- locked NCO logo zone: bottom-right approximate

These are configurable because the final production overlay and mask have not been dropped in yet.

## Portal Routes

- `/portal/bag-maker`
- `/portal/api/bag-designs`
- `/portal/api/bag-designs/[id]`
- `/portal/api/bag-designs/[id]/upload`
- `/portal/api/bag-designs/[id]/render`
- `/portal/api/bag-designs/[id]/add-to-cart`

## Storage

V1 expects these Supabase Storage buckets:

- `bag-design-assets`
- `bag-art`

Bucket creation is not handled by the current migrations in this repo, so create them manually in Supabase before production rollout.

Recommended object paths:

- `bag-design-assets/{designId}/{assetId}-{filename}`
- `bag-art/{designId}/slow-side-production.png`
- `bag-art/{designId}/fast-side-production.png`
- `bag-art/{designId}/customer-proof.png`

In non-production fallback mode, the routes can temporarily use data URLs if the buckets are not available so local development does not crash.

## Public Asset Locations

Final production-ready static assets should be placed here:

- `public/images/bag-maker/nco-logo.png`
- `public/images/bag-maker/bag-template-overlay.png`
- `public/images/bag-maker/bag-shape-mask.png`

Current behavior:

- if `nco-logo.png` is missing, the feature falls back to `public/images/nco-mark.png`
- overlay and mask files are optional in V1
- preview uses dashed guide zones even when overlay assets are not present

## Cart Integration

Bag Maker V1 adds a custom cart item that flows into the existing local cart and Stripe checkout path.

Current assumptions:

- item slug: `custom-bag-set`
- default placeholder price comes from `NCO_CUSTOM_BAG_PRICE_CENTS` when set
- fallback placeholder price is defined in config
- add to cart requires a generated proof and explicit approval checkbox

## Known V1 Limitations

- RGB PNG output only
- approximate placement zones until final bag mask and overlay assets are provided
- no SVG upload support
- PNG and JPEG uploads only
- limited safe font list
- organizer-only portal access for now
- no freeform design positioning
- custom bag orders mark bag designs as ordered from store checkout webhook metadata, but there is no separate manufacturing workflow yet

## Follow-up Fit for V2

- final production overlay and real bag mask assets
- richer proof styling and alternate mockups
- club-manager scoped access if desired
- customer-facing custom bag flow
- manufacturing status workflow after checkout
- sanitized SVG upload pipeline if needed

