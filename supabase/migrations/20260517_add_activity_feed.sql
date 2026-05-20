create table if not exists public.activity_feed (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid null references public.profiles(id) on delete set null,
  activity_type text not null,
  entity_type text null,
  entity_id uuid null,
  title text not null,
  message text null,
  metadata jsonb not null default '{}'::jsonb,
  visibility text not null default 'members',
  created_at timestamptz not null default now(),
  constraint activity_feed_activity_type_check check (
    activity_type in (
      'profile_joined',
      'event_created',
      'event_registered',
      'club_created',
      'club_joined',
      'bag_design_created',
      'bag_proof_generated',
      'badge_earned',
      'general'
    )
  ),
  constraint activity_feed_visibility_check check (
    visibility in ('public', 'members', 'private')
  )
);

create index if not exists activity_feed_created_at_idx on public.activity_feed (created_at desc);
create index if not exists activity_feed_actor_profile_id_idx on public.activity_feed (actor_profile_id);
create index if not exists activity_feed_activity_type_idx on public.activity_feed (activity_type);
create index if not exists activity_feed_entity_idx on public.activity_feed (entity_type, entity_id);
create index if not exists activity_feed_visibility_idx on public.activity_feed (visibility);

alter table public.activity_feed enable row level security;

drop policy if exists "activity_feed_select_members" on public.activity_feed;
create policy "activity_feed_select_members"
  on public.activity_feed
  for select
  to authenticated
  using (visibility in ('public', 'members'));

drop policy if exists "activity_feed_select_own_private" on public.activity_feed;
create policy "activity_feed_select_own_private"
  on public.activity_feed
  for select
  to authenticated
  using (visibility = 'private' and actor_profile_id = auth.uid());

drop policy if exists "activity_feed_select_admin_all" on public.activity_feed;
create policy "activity_feed_select_admin_all"
  on public.activity_feed
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );
