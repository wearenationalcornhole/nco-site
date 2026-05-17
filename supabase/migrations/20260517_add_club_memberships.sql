create table if not exists public.club_memberships (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (club_id, profile_id),
  constraint club_memberships_role_check check (role in ('owner', 'manager', 'staff', 'member'))
);

create index if not exists club_memberships_club_id_idx on public.club_memberships (club_id);
create index if not exists club_memberships_profile_id_idx on public.club_memberships (profile_id);
create index if not exists club_memberships_role_idx on public.club_memberships (role);

comment on table public.club_memberships is
  'Club-scoped permission records. public.profiles remains canonical identity; profiles.primary_club_id is affiliation only.';

comment on column public.club_memberships.role is
  'Club-scoped role. owner and manager can manage club settings; staff/member do not imply organizer access.';

-- Conservative backfill note:
-- This migration intentionally does not auto-promote profiles.primary_club_id into management roles.
-- primary_club_id represents affiliation/default club, not permission.
-- If a trusted owner field exists in production, review it manually before inserting owner rows here.
