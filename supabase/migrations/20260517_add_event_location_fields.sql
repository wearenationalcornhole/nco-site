alter table public.events
add column if not exists region text,
add column if not exists country text default 'US';
