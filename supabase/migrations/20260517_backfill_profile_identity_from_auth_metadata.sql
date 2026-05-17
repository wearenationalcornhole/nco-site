with auth_source as (
  select
    p.id,
    nullif(trim(coalesce(u.raw_user_meta_data ->> 'display_name', '')), '') as display_name,
    nullif(trim(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', '')), '') as full_name,
    nullif(trim(coalesce(u.raw_user_meta_data ->> 'first_name', '')), '') as first_name,
    nullif(trim(coalesce(u.raw_user_meta_data ->> 'last_name', '')), '') as last_name,
    nullif(trim(coalesce(u.raw_user_meta_data ->> 'city', '')), '') as city,
    nullif(trim(coalesce(u.raw_user_meta_data ->> 'region', u.raw_user_meta_data ->> 'state', '')), '') as region,
    nullif(trim(coalesce(u.raw_user_meta_data ->> 'favorite_bag_style', u.raw_user_meta_data ->> 'favorite_bag', '')), '') as favorite_bag_style,
    nullif(trim(coalesce(u.raw_user_meta_data ->> 'home_venue', '')), '') as home_venue,
    nullif(trim(coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture', '')), '') as avatar_url,
    case lower(coalesce(u.raw_user_meta_data ->> 'skill_level', ''))
      when 'backyard' then 'backyard'
      when 'social' then 'social'
      when 'competitive' then 'competitive'
      when 'advanced' then 'advanced'
      when 'pro' then 'pro'
      else null
    end as skill_level,
    case lower(coalesce(u.raw_user_meta_data ->> 'dominant_hand', ''))
      when 'right' then 'right'
      when 'left' then 'left'
      when 'switch' then 'switch'
      else null
    end as dominant_hand,
    case lower(coalesce(u.raw_user_meta_data ->> 'profile_visibility', u.raw_user_meta_data ->> 'visibility', ''))
      when 'public' then 'public'
      when 'members' then 'members'
      when 'private' then 'private'
      else null
    end as profile_visibility
  from public.profiles p
  join auth.users u on u.id = p.id
),
normalized as (
  select
    id,
    display_name,
    case
      when first_name is not null then first_name
      when full_name is not null and position(' ' in full_name) > 0 then split_part(full_name, ' ', 1)
      else null
    end as normalized_first_name,
    case
      when last_name is not null then last_name
      when full_name is not null and position(' ' in full_name) > 0 then nullif(trim(substr(full_name, position(' ' in full_name) + 1)), '')
      else null
    end as normalized_last_name,
    city,
    region,
    favorite_bag_style,
    home_venue,
    avatar_url,
    skill_level,
    dominant_hand,
    profile_visibility
  from auth_source
)
update public.profiles p
set
  display_name = case
    when nullif(trim(coalesce(p.display_name, '')), '') is null and n.display_name is not null then n.display_name
    else p.display_name
  end,
  first_name = case
    when nullif(trim(coalesce(p.first_name, '')), '') is null and n.normalized_first_name is not null then n.normalized_first_name
    else p.first_name
  end,
  last_name = case
    when nullif(trim(coalesce(p.last_name, '')), '') is null and n.normalized_last_name is not null then n.normalized_last_name
    else p.last_name
  end,
  city = case
    when nullif(trim(coalesce(p.city, '')), '') is null and n.city is not null then n.city
    else p.city
  end,
  region = case
    when nullif(trim(coalesce(p.region, '')), '') is null and n.region is not null then n.region
    else p.region
  end,
  favorite_bag_style = case
    when nullif(trim(coalesce(p.favorite_bag_style, '')), '') is null and n.favorite_bag_style is not null then n.favorite_bag_style
    else p.favorite_bag_style
  end,
  home_venue = case
    when nullif(trim(coalesce(p.home_venue, '')), '') is null and n.home_venue is not null then n.home_venue
    else p.home_venue
  end,
  avatar_url = case
    when nullif(trim(coalesce(p.avatar_url, '')), '') is null and n.avatar_url is not null then n.avatar_url
    else p.avatar_url
  end,
  skill_level = case
    when nullif(trim(coalesce(p.skill_level, '')), '') is null and n.skill_level is not null then n.skill_level
    else p.skill_level
  end,
  dominant_hand = case
    when nullif(trim(coalesce(p.dominant_hand, '')), '') is null and n.dominant_hand is not null then n.dominant_hand
    else p.dominant_hand
  end,
  profile_visibility = case
    when nullif(trim(coalesce(p.profile_visibility, '')), '') is null and n.profile_visibility is not null then n.profile_visibility
    when p.profile_visibility = 'public' and n.profile_visibility in ('members', 'private') then p.profile_visibility
    else p.profile_visibility
  end,
  updated_at = case
    when (
      (nullif(trim(coalesce(p.display_name, '')), '') is null and n.display_name is not null) or
      (nullif(trim(coalesce(p.first_name, '')), '') is null and n.normalized_first_name is not null) or
      (nullif(trim(coalesce(p.last_name, '')), '') is null and n.normalized_last_name is not null) or
      (nullif(trim(coalesce(p.city, '')), '') is null and n.city is not null) or
      (nullif(trim(coalesce(p.region, '')), '') is null and n.region is not null) or
      (nullif(trim(coalesce(p.favorite_bag_style, '')), '') is null and n.favorite_bag_style is not null) or
      (nullif(trim(coalesce(p.home_venue, '')), '') is null and n.home_venue is not null) or
      (nullif(trim(coalesce(p.avatar_url, '')), '') is null and n.avatar_url is not null) or
      (nullif(trim(coalesce(p.skill_level, '')), '') is null and n.skill_level is not null) or
      (nullif(trim(coalesce(p.dominant_hand, '')), '') is null and n.dominant_hand is not null) or
      (nullif(trim(coalesce(p.profile_visibility, '')), '') is null and n.profile_visibility is not null)
    ) then timezone('utc', now())
    else p.updated_at
  end
from normalized n
where p.id = n.id;
