alter table public.clips
add column if not exists exported boolean not null default false,
add column if not exists exported_at timestamptz;

