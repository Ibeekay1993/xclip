-- X-CLIP / Hook Hunter schema
-- Idempotent migration for the current app flow:
-- clip_jobs -> analysis jobs
-- clips -> generated clip records
-- storage bucket: videos

create extension if not exists pgcrypto;

create table if not exists public.clip_jobs (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid references auth.users,
  video_url text not null,
  video_title text,
  status text not null default 'pending'
    check (status in ('pending', 'downloading', 'transcribing', 'analyzing', 'generating', 'complete', 'error')),
  error_message text,
  batch_id text,
  uploaded_file_url text,
  transcript_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clips (
  id uuid not null default gen_random_uuid() primary key,
  job_id uuid not null references public.clip_jobs(id) on delete cascade,
  clip_number integer not null,
  start_time double precision not null,
  end_time double precision not null,
  duration double precision not null,
  reason text not null,
  hook_score integer default 0,
  thumbnail_url text,
  video_url text,
  transcript text,
  captions jsonb default '[]'::jsonb,
  export_preset text default '9:16',
  source_type text default 'url',
  created_at timestamptz not null default now()
);

create index if not exists idx_clips_job_id on public.clips(job_id);
create index if not exists idx_clip_jobs_status on public.clip_jobs(status);

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists update_clip_jobs_updated_at on public.clip_jobs;
create trigger update_clip_jobs_updated_at
before update on public.clip_jobs
for each row
execute function public.update_updated_at_column();

alter table public.clip_jobs enable row level security;
alter table public.clips enable row level security;

drop policy if exists "Allow public read for clip_jobs" on public.clip_jobs;
drop policy if exists "Allow public insert for clip_jobs" on public.clip_jobs;
drop policy if exists "Allow public update for clip_jobs" on public.clip_jobs;
drop policy if exists "Allow public read for clips" on public.clips;
drop policy if exists "Allow public insert for clips" on public.clips;
drop policy if exists "Allow public update for clips" on public.clips;

create policy "Allow public read for clip_jobs"
on public.clip_jobs
for select
using (true);

create policy "Allow public insert for clip_jobs"
on public.clip_jobs
for insert
with check (true);

create policy "Allow public update for clip_jobs"
on public.clip_jobs
for update
using (true)
with check (true);

create policy "Allow public read for clips"
on public.clips
for select
using (true);

create policy "Allow public insert for clips"
on public.clips
for insert
with check (true);

create policy "Allow public update for clips"
on public.clips
for update
using (true)
with check (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
select
  'videos',
  'videos',
  true,
  524288000,
  array['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/mkv']
where not exists (
  select 1 from storage.buckets where id = 'videos'
);

drop policy if exists "Anyone can view videos" on storage.objects;
drop policy if exists "Anyone can upload videos" on storage.objects;
drop policy if exists "Anyone can update their videos" on storage.objects;
drop policy if exists "Anyone can delete videos" on storage.objects;

create policy "Anyone can view videos"
on storage.objects
for select
using (bucket_id = 'videos');

create policy "Anyone can upload videos"
on storage.objects
for insert
with check (bucket_id = 'videos');

create policy "Anyone can update their videos"
on storage.objects
for update
using (bucket_id = 'videos')
with check (bucket_id = 'videos');

create policy "Anyone can delete videos"
on storage.objects
for delete
using (bucket_id = 'videos');

