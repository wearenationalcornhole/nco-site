# Community Schema Proposal

The Community MVP intentionally avoids writing club follow or join intent into the current database because the live runtime uses Supabase `profiles` while Prisma club membership points at a separate `users` model. Public player visibility also is not queryable today.

## Current Gaps

- No queryable `profile_visibility` field exists on the profile table used by the portal runtime.
- No club follow or join-intent table exists in the current app flow.
- Prisma `club_members.user_id` points at `users`, while the portal primarily works from Supabase-authenticated `profiles`.

## Recommended Migration

Add a first-class public/community profile model to the runtime table the portal already uses, plus explicit club intent tables:

```prisma
model club_follow_intents {
  id         String   @id @default(cuid())
  club_id     String   @db.Uuid
  profile_id  String   @db.Uuid
  status      String   @default("pending") // pending | approved | declined
  created_at  DateTime @default(now()) @db.Timestamptz(6)
  updated_at  DateTime @updatedAt
}
```

Recommended additions to the live profile model/table:

- `display_name`
- `favorite_bag`
- `skill_level`
- `profile_visibility`

## Why This Is Deferred

The MVP uses Supabase auth metadata for `display_name`, `favorite_bag`, `skill_level`, and `profile_visibility` so members can edit those values immediately without risking the existing portal auth flow. Public player discovery and club join requests should wait until:

1. the profile fields are stored in a queryable table,
2. club intent records can link to the same user/profile identity the portal uses,
3. RLS or equivalent policies explicitly define who can read public and member-only community data.
