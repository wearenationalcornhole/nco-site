-- Manual Supabase SQL Editor checks for profile identity rollout verification.
-- public.profiles is the canonical app identity source.
-- Review results before applying any repair or backfill steps in production.

-- A. RLS status
select
  schemaname,
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public'
and tablename in (
  'profiles',
  'registrations',
  'events',
  'clubs',
  'activity_feed',
  'badges',
  'profile_badges',
  'follows'
)
order by tablename;

-- B. Policies on relevant tables
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
and tablename in (
  'profiles',
  'registrations',
  'events',
  'clubs',
  'activity_feed',
  'badges',
  'profile_badges',
  'follows'
)
order by tablename, policyname;

-- C. Auth users missing profiles
select
  u.id,
  u.email,
  u.created_at
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
order by u.created_at desc;

-- D. Registrations with user_id missing profiles
select
  r.id as registration_id,
  r.user_id,
  r.event_id,
  r.created_at
from public.registrations r
left join public.profiles p on p.id = r.user_id
where r.user_id is not null
and p.id is null
order by r.created_at desc;

-- E. Profiles missing core display fields
select
  id,
  email,
  first_name,
  last_name,
  display_name,
  role,
  created_at
from public.profiles
where nullif(trim(coalesce(display_name, '')), '') is null
and (
  nullif(trim(coalesce(first_name, '')), '') is null
  or nullif(trim(coalesce(last_name, '')), '') is null
)
order by created_at desc;

-- F. Profiles with invalid or null visibility
select
  id,
  email,
  profile_visibility
from public.profiles
where profile_visibility is null
or profile_visibility not in ('public', 'members', 'private');

-- G. Profiles with invalid player identity fields
select
  id,
  email,
  skill_level,
  dominant_hand
from public.profiles
where (
  skill_level is not null
  and skill_level not in ('backyard', 'social', 'competitive', 'advanced', 'pro')
)
or (
  dominant_hand is not null
  and dominant_hand not in ('right', 'left', 'switch')
);

-- H. Legacy public.users mismatch, if that table exists in this environment.
-- Run only when public.users exists.
select
  u.id,
  u.email
from public.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- I. Suggested repair approach
-- 1. Review auth.users rows that are missing profiles before creating any new records.
-- 2. Backfill display fields only into blank public.profiles columns.
-- 3. Never overwrite populated profile fields without manual review.
-- 4. If legacy public.users rows still exist without matching profiles, treat them as
--    compatibility/data-repair candidates rather than canonical identity records.
