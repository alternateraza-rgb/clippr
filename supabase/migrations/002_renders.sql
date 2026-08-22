-- =============================================================================
-- Clipmuse 002 — renders, per-user feed, discovery extras, clips bucket
-- Safe to re-run after 001_init.sql
-- =============================================================================

alter table public.transcript_cache drop constraint if exists transcript_cache_source_check;
alter table public.transcript_cache
  add constraint transcript_cache_source_check
  check (source in ('captions', 'whisper', 'none'));

alter table public.analysis_cache drop constraint if exists analysis_cache_source_check;
alter table public.analysis_cache
  add constraint analysis_cache_source_check
  check (source is null or source in ('llm', 'heuristic', 'whisper'));

alter table public.video_cache add column if not exists view_count bigint;
alter table public.video_cache add column if not exists channel_id text;
alter table public.video_cache add column if not exists description text;

alter table public.discovery_cache add column if not exists view_count bigint;
alter table public.discovery_cache add column if not exists channel_id text;
alter table public.discovery_cache add column if not exists search_query text;
alter table public.discovery_cache add column if not exists llm_rationale text not null default '';

alter table public.clip_jobs drop constraint if exists clip_jobs_status_check;
alter table public.clip_jobs
  add constraint clip_jobs_status_check
  check (status in (
    'preview', 'queued', 'saved',
    'downloading', 'transcribing', 'scoring', 'rendering', 'ready', 'failed'
  ));

create table if not exists public.user_feed (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  for_date date not null,
  video_id text not null,
  niche text not null references public.niches (id),
  score int not null default 0 check (score between 0 and 100),
  hook text not null default '',
  why_it_clips text not null default '',
  llm_rationale text not null default '',
  video jsonb,
  estimated_clip_count int not null default 3,
  platforms text[] not null default '{}',
  discovery_id uuid references public.discovery_cache (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, for_date, video_id)
);

alter table public.user_feed drop constraint if exists user_feed_platforms_check;
alter table public.user_feed
  add constraint user_feed_platforms_check
  check (platforms <@ array['youtube', 'tiktok', 'instagram']::text[]);

create index if not exists user_feed_user_date_score_idx
  on public.user_feed (user_id, for_date, score desc);

drop trigger if exists user_feed_set_updated_at on public.user_feed;
create trigger user_feed_set_updated_at
  before update on public.user_feed
  for each row execute function public.set_updated_at();

alter table public.user_feed enable row level security;
drop policy if exists "user_feed_select_own" on public.user_feed;
drop policy if exists "user_feed_write_own" on public.user_feed;
create policy "user_feed_select_own" on public.user_feed
  for select using (auth.uid() = user_id);
create policy "user_feed_write_own" on public.user_feed
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on public.user_feed to authenticated, service_role;

create table if not exists public.clip_renders (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.clip_jobs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  video_id text not null,
  status text not null default 'queued',
  progress int not null default 0,
  error text,
  asr_source text,
  model text,
  source_path text,
  output_path text,
  output_bytes bigint,
  duration_s numeric,
  start_s numeric,
  end_s numeric,
  gameplay text,
  caption_preset text,
  caption_lines jsonb not null default '[]',
  moment jsonb,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.clip_renders add column if not exists caption_lines jsonb not null default '[]';
alter table public.clip_renders add column if not exists moment jsonb;
alter table public.clip_renders add column if not exists finished_at timestamptz;

alter table public.clip_renders drop constraint if exists clip_renders_status_check;
alter table public.clip_renders
  add constraint clip_renders_status_check
  check (status in ('queued', 'downloading', 'transcribing', 'scoring', 'rendering', 'ready', 'failed'));

alter table public.clip_renders drop constraint if exists clip_renders_progress_check;
alter table public.clip_renders
  add constraint clip_renders_progress_check
  check (progress between 0 and 100);

alter table public.clip_renders drop constraint if exists clip_renders_asr_check;
alter table public.clip_renders
  add constraint clip_renders_asr_check
  check (asr_source is null or asr_source in ('captions', 'whisper'));

alter table public.clip_renders drop constraint if exists clip_renders_gameplay_check;
alter table public.clip_renders
  add constraint clip_renders_gameplay_check
  check (gameplay is null or gameplay in ('gta', 'minecraft', 'subway', 'none'));

alter table public.clip_renders drop constraint if exists clip_renders_caption_check;
alter table public.clip_renders
  add constraint clip_renders_caption_check
  check (caption_preset is null or caption_preset in ('hormozi', 'clean', 'karaoke'));

create index if not exists clip_renders_user_created_idx
  on public.clip_renders (user_id, created_at desc);
create index if not exists clip_renders_status_idx
  on public.clip_renders (status)
  where status in ('queued', 'downloading', 'transcribing', 'scoring', 'rendering');

drop trigger if exists clip_renders_set_updated_at on public.clip_renders;
create trigger clip_renders_set_updated_at
  before update on public.clip_renders
  for each row execute function public.set_updated_at();

alter table public.clip_renders enable row level security;
drop policy if exists "clip_renders_select_own" on public.clip_renders;
drop policy if exists "clip_renders_insert_own" on public.clip_renders;
drop policy if exists "clip_renders_update_own" on public.clip_renders;
create policy "clip_renders_select_own" on public.clip_renders
  for select using (auth.uid() = user_id);
create policy "clip_renders_insert_own" on public.clip_renders
  for insert with check (auth.uid() = user_id);
create policy "clip_renders_update_own" on public.clip_renders
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on public.clip_renders to authenticated, service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'clips',
  'clips',
  false,
  209715200,
  array['video/mp4', 'video/webm', 'audio/mpeg', 'audio/wav', 'audio/webm', 'audio/mp4']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "clips_select_own" on storage.objects;
drop policy if exists "clips_insert_own" on storage.objects;
drop policy if exists "clips_update_own" on storage.objects;
drop policy if exists "clips_delete_own" on storage.objects;

create policy "clips_select_own" on storage.objects
  for select using (
    bucket_id = 'clips'
    and split_part(name, '/', 1) = auth.uid()::text
  );
create policy "clips_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'clips'
    and split_part(name, '/', 1) = auth.uid()::text
  );
create policy "clips_update_own" on storage.objects
  for update using (
    bucket_id = 'clips'
    and split_part(name, '/', 1) = auth.uid()::text
  );
create policy "clips_delete_own" on storage.objects
  for delete using (
    bucket_id = 'clips'
    and split_part(name, '/', 1) = auth.uid()::text
  );
