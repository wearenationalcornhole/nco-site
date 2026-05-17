## Profile identity architecture

- `public.profiles` is the canonical identity source for app display and community data.
- Every logged-in person has one shared profile identity. Organizer and admin roles add capabilities; they do not create separate identities.
- New features should resolve display identity from `public.profiles` first by using the shared helpers in [app/lib/profileCapabilities.ts](/Users/gregoryortegae/Documents/Cornhole/NCO/NEWSITE/app/lib/profileCapabilities.ts) and [app/lib/profileIdentity.ts](/Users/gregoryortegae/Documents/Cornhole/NCO/NEWSITE/app/lib/profileIdentity.ts).
- The Prisma `users` model remains in the codebase for legacy compatibility around payments, admin utilities, and older fallback flows. It should not be used as the primary source of person display names when a profile id exists.
- Safe display-name fallback order is:
  1. `profiles.display_name`
  2. `profiles.first_name + profiles.last_name`
  3. email prefix
  4. `NCO Player`

## Profiles, Event Organizers, and Club Managers

- `public.profiles` remains identity. Roles and memberships are permissions layered onto that shared identity.
- `profiles.role` controls broad platform capability:
  - `player`: player, profile, and community features
  - `organizer`: player features plus event organizer tooling
  - `admin`: platform-wide admin access
- `public.club_memberships` controls club-scoped access:
  - `owner` and `manager` can manage club-scoped settings and memberships
  - `staff` and `member` do not imply management
- A club manager is not automatically an event organizer.
- An event organizer is not automatically a club manager.
- A person can be both by having `profiles.role = 'organizer'` and a `club_memberships` row with role `owner` or `manager`.
- `primary_club_id` is affiliation/default club only. It should not be used as management permission.
- Admin can bypass scoped checks where appropriate.

Examples:
- Player only: `profiles.role = 'player'`, no club-management membership.
- Club manager only: `profiles.role = 'player'`, plus `club_memberships.role = 'manager'` for a specific club.
- Event organizer only: `profiles.role = 'organizer'`, no club-management membership required.
- Both organizer and club manager: `profiles.role = 'organizer'` plus `club_memberships.role = 'owner'` or `manager`.
- Admin: `profiles.role = 'admin'`.
