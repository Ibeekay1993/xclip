alter table public.clip_jobs
add column if not exists source_video_id text;

alter table public.clips
add column if not exists source_video_id text;

create index if not exists idx_clip_jobs_source_video_id
on public.clip_jobs (source_video_id);

create index if not exists idx_clips_source_video_id
on public.clips (source_video_id);
