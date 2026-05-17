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
