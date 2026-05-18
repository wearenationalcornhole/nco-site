create table if not exists public.bag_designs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid null references public.events(id) on delete set null,
  club_id uuid null references public.clubs(id) on delete set null,
  status text not null default 'draft',
  bag_color_hex text not null default '#ffffff',
  bag_color_cmyk jsonb null,
  slow_side_art_url text null,
  fast_side_art_url text null,
  proof_url text null,
  design_json jsonb not null default '{}'::jsonb,
  cart_item_id text null,
  order_id text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bag_designs_status_check check (
    status in ('draft', 'rendered', 'added_to_cart', 'ordered', 'archived')
  )
);

create table if not exists public.bag_design_assets (
  id uuid primary key default gen_random_uuid(),
  bag_design_id uuid not null references public.bag_designs(id) on delete cascade,
  asset_type text not null,
  file_url text not null,
  storage_path text null,
  original_filename text null,
  mime_type text null,
  size_bytes integer null,
  width_px integer null,
  height_px integer null,
  created_at timestamptz not null default now(),
  constraint bag_design_assets_type_check check (
    asset_type in ('main_art_slow', 'main_art_fast', 'organizer_logo', 'sponsor_logo', 'event_logo', 'proof', 'production_art')
  )
);

create index if not exists bag_designs_profile_id_idx on public.bag_designs (profile_id);
create index if not exists bag_designs_event_id_idx on public.bag_designs (event_id);
create index if not exists bag_designs_club_id_idx on public.bag_designs (club_id);
create index if not exists bag_designs_status_idx on public.bag_designs (status);
create index if not exists bag_design_assets_bag_design_id_idx on public.bag_design_assets (bag_design_id);

