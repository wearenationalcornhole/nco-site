alter table public.profiles
add column if not exists display_name text,
add column if not exists bio text,
add column if not exists skill_level text,
add column if not exists favorite_bag_style text,
add column if not exists dominant_hand text,
add column if not exists home_venue text,
add column if not exists profile_visibility text not null default 'public';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_skill_level_check'
  ) then
    alter table public.profiles
    add constraint profiles_skill_level_check
    check (
      skill_level is null
      or skill_level in ('backyard', 'social', 'competitive', 'advanced', 'pro')
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_dominant_hand_check'
  ) then
    alter table public.profiles
    add constraint profiles_dominant_hand_check
    check (
      dominant_hand is null
      or dominant_hand in ('right', 'left', 'switch')
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_profile_visibility_check'
  ) then
    alter table public.profiles
    add constraint profiles_profile_visibility_check
    check (profile_visibility in ('public', 'members', 'private'));
  end if;
end $$;
