# Community Pulse + Cornhole Near Me

## Purpose

Community Pulse + Cornhole Near Me makes the portal feel active between registrations by surfacing recent NCO activity and lightweight local discovery inside the authenticated member experience.

V1 is intentionally conservative:

- system-generated activity only
- no comments, likes, DMs, or moderation-heavy social features
- no GPS, geocoding, or map UI
- city and region matching only

## New Data Model

Migration: `supabase/migrations/20260517_add_activity_feed.sql`

Table: `public.activity_feed`

Columns:

- `id`
- `actor_profile_id`
- `activity_type`
- `entity_type`
- `entity_id`
- `title`
- `message`
- `metadata`
- `visibility`
- `created_at`

Indexes:

- `activity_feed_created_at_idx`
- `activity_feed_actor_profile_id_idx`
- `activity_feed_activity_type_idx`
- `activity_feed_entity_idx`
- `activity_feed_visibility_idx`

RLS:

- authenticated users can read `public` and `members` activity
- a user can read their own `private` activity
- admins can read all activity through a `profiles.role = 'admin'` policy
- no authenticated insert, update, or delete policy is granted
- server-side writes should use trusted server helpers only

## Supported Activity Types

- `profile_joined`
- `event_created`
- `event_registered`
- `club_created`
- `club_joined`
- `bag_design_created`
- `bag_proof_generated`
- `badge_earned`
- `general`

## V1 Activity Hooks

Current emitted activity:

- `event_created`
  - emitted after successful organizer event creation
- `event_registered`
  - emitted after successful free registration
  - emitted after paid registration is persisted from the Stripe webhook path
- `bag_proof_generated`
  - emitted after bag proof render succeeds
- `profile_joined`
  - emitted after a previously incomplete profile is successfully completed

Not emitted yet in V1:

- `club_created`
- `club_joined`
- `bag_design_created`
- `badge_earned`
- `general`

## Server Helpers

`app/lib/activityFeed.ts`

- `createActivity()`
- `createActivityIfNotExists()`
- `listCommunityActivity()`
- `listProfileActivity()`
- event/profile/bag helper emitters

Design notes:

- activity writes are best-effort
- helper failures are logged server-side and do not block the primary action
- duplicate-prone paths use `activity_type + entity_type + entity_id` idempotency
- profile display names are resolved from `public.profiles` first
- bag proof activity metadata intentionally excludes production bag art URLs
- `bag_design_created` is reserved for future use; V1 emits `bag_proof_generated` once a design reaches a meaningful proof step

`app/lib/cornholeNearMe.ts`

Returns:

- `nearbyEvents`
- `nearbyClubs`
- `nearbyPlayers`
- `locationLabel`
- `needsLocationSetup`
- `discoveryNote`

## Cornhole Near Me Matching Logic

Inputs come from the shared profile identity:

- `profiles.city`
- `profiles.region`
- `profiles.country`

Nearby matching uses existing table data only:

- events: prefers explicit `region` matches when available, then city matches, and only falls back to city-string heuristics for older rows without a stored region
- clubs: uses `city` plus `region` or `state`
- players: uses `city` plus `region`, excludes the current user, and excludes `private` profiles

Priority order:

1. exact city match
2. city string contains the viewer city
3. exact region match
4. city string contains the viewer region
5. broader fallback for events only if local event matches are empty

Nearby player links:

- V1 links nearby players to the existing authenticated player directory at `/portal/players`
- there is no dedicated safe player detail page route yet
- future player detail pages should reuse the existing privacy checks before deep-linking individual profiles

Limits:

- events: 5
- clubs: 5
- players: 8

## Missing Location Handling

If a profile has neither city nor region:

- `needsLocationSetup = true`
- the dashboard and `/portal/community` show a prompt to update the shared profile
- no GPS or browser location permission is requested

## UI Surface

Dashboard additions:

- `Community Pulse`
- `Cornhole Near Me`

Portal page:

- `/portal/community`

Reusable portal components:

- `app/portal/components/CommunityPulseCard.tsx`
- `app/portal/components/CornholeNearMeCard.tsx`
- `app/portal/components/ActivityFeedList.tsx`
- `app/portal/components/NearMeList.tsx`

Navigation:

- authenticated portal top bar now includes `Community`

## Dev Fallback

`app/lib/devStore.ts` now includes an `activity_feed` collection.

Fallback behavior:

- if Supabase service access is unavailable, activity writes and reads use `devStore`
- near-me data uses `devStore` records when present
- club fallback can reuse the existing seed clubs
- event fallback can reuse the existing local event seed file
- empty states are rendered instead of crashing when no local data exists

## V1 Limitations

- no GPS or geocoding
- no map UI
- no comments, likes, DMs, or follow graphs
- no moderation tooling
- region and city matching only
- activity is system-generated only
- club creation activity is not wired yet because there is no clean club creation route in the current branch
- older events may still need manual `region` backfill if they were created before the durable event location fields existed

## Event Location Normalization

Migration: `supabase/migrations/20260517_add_event_location_fields.sql`

Fields:

- `events.city`
- `events.region`
- `events.country` with default `US`

Current behavior:

- new event creation and organizer editing now capture `city`, `region`, and `country`
- `event_created` and `event_registered` activity metadata now carries safe location fields when available
- Cornhole Near Me uses explicit event `region` first and only falls back to city-string matching for older events without normalized location data
- existing older events are left untouched rather than attempting risky parsing of free-form city strings

## Future Enhancements

- map view
- partner finder
- badges and streaks
- club pages
- event recaps
- richer local discovery ranking
- shareable player and event cards
