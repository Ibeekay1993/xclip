-- Reset any legacy Lovable-era schema objects before applying the Clipzux schema.
-- This keeps the new project clean and avoids mixed old/new tables.

do $$
begin
  if to_regclass('public.clip_jobs') is not null then
    execute 'drop trigger if exists update_clip_jobs_updated_at on public.clip_jobs';
  end if;
end
$$;

drop function if exists public.update_updated_at_column();

do $$
begin
  if to_regclass('public.videos') is not null then
    execute 'drop policy if exists "Allow public access" on public.videos';
  end if;
  if to_regclass('public.clips') is not null then
    execute 'drop policy if exists "Allow public access" on public.clips';
  end if;
  if to_regclass('public.transcriptions') is not null then
    execute 'drop policy if exists "Allow public access" on public.transcriptions';
  end if;
  if to_regclass('public.face_tracks') is not null then
    execute 'drop policy if exists "Allow public access" on public.face_tracks';
  end if;
end
$$;

drop table if exists public.face_tracks cascade;
drop table if exists public.transcriptions cascade;
drop table if exists public.videos cascade;
drop table if exists public.clips cascade;
drop table if exists public.clip_jobs cascade;

drop type if exists public.video_status cascade;
drop type if exists public.clip_type cascade;
