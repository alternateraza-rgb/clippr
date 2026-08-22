-- =============================================================================
-- Clipmuse — complete A–Z Postgres schema for Supabase
-- =============================================================================
-- Paste this entire file into the Supabase SQL editor (or run as a migration).
-- Safe to re-run: tables/columns are created if missing, policies are replaced.
--
-- Maps 1:1 to the TypeScript models in lib/agent/types.ts and the routes in:
--   profiles        ← /api/profile, auth trigger, middleware onboarding gate
--   niches/formats  ← onboarding + settings catalogs
--   video_cache     ← YouTube metadata (hydrateVideo / discovery)
--   transcript_cache← caption segments + exploded word timings
--   analysis_cache  ← scored clip candidates keyed by video + rubric version
--   discovery_cache ← today's Ideas feed
--   discovery_quota ← YouTube search cap (80/day)
--   clip_jobs       ← Library saves from Studio
-- =============================================================================

-- ---------------------------------------------------------------------------
-- A. Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- B. Shared helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      ''
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.drop_policies(p_table text)
returns void
language plpgsql
as $$
declare
  r record;
begin
  for r in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = p_table
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, p_table);
  end loop;
end;
$$;

revoke all on function public.drop_policies(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- C. Catalog: niches (onboarding + settings + discovery)
-- ---------------------------------------------------------------------------
create table if not exists public.niches (
  id text primary key,
  label text not null,
  blurb text not null,
  opportunity int not null check (opportunity between 0 and 100),
  competition int not null check (competition between 0 and 100),
  evergreen int not null check (evergreen between 0 and 100),
  monetization int not null check (monetization between 0 and 100)
);

insert into public.niches (id, label, blurb, opportunity, competition, evergreen, monetization)
values
  ('finance', 'Finance', 'Money advice that actually clips — hooks, contrarian takes, payoff.', 92, 78, 88, 94),
  ('true-crime', 'True crime', 'Story beats with built-in cliffhangers. Shorts eat this alive.', 86, 71, 80, 74),
  ('podcasts', 'Podcasts', 'Long conversations hide 20-second gold. Highest clip density.', 90, 64, 84, 81),
  ('sports', 'Sports', 'Reactions and highlights. Fast half-life, huge volume.', 77, 82, 42, 70),
  ('fitness', 'Fitness', 'Before/after energy and one-rule advice. Reliable saves.', 81, 76, 90, 83),
  ('faith', 'Faith', 'Sermon cuts and testimony. Quiet niche, loyal watch time.', 73, 38, 93, 68),
  ('comedy', 'Comedy', 'Punchlines travel. Timing is everything — we cut to the laugh.', 84, 88, 61, 72),
  ('tech', 'Tech', 'Demos, takes, and “this changes everything” moments.', 79, 80, 55, 86),
  ('politics', 'Politics', 'Heated exchanges clip well. High velocity, high risk.', 75, 85, 28, 60),
  ('storytime', 'Storytime', 'First-person stories with a twist. Native to Shorts.', 83, 69, 76, 71),
  ('self-improvement', 'Self-improvement', 'One hard truth per clip. The Hormozi machine.', 88, 83, 91, 87),
  ('gaming', 'Gaming', 'Commentary over gameplay — you already have the bottom half.', 80, 90, 67, 75)
on conflict (id) do update set
  label = excluded.label,
  blurb = excluded.blurb,
  opportunity = excluded.opportunity,
  competition = excluded.competition,
  evergreen = excluded.evergreen,
  monetization = excluded.monetization;

-- ---------------------------------------------------------------------------
-- D. Catalog: formats (profile.interests)
-- ---------------------------------------------------------------------------
create table if not exists public.formats (
  id text primary key,
  label text not null
);

insert into public.formats (id, label)
values
  ('storytelling', 'Storytelling'),
  ('debate', 'Debate'),
  ('highlights', 'Highlights'),
  ('commentary', 'Commentary'),
  ('reaction', 'Reaction')
on conflict (id) do update set label = excluded.label;

-- ---------------------------------------------------------------------------
-- E. Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  platforms text[] not null default '{}',
  niche text not null default 'finance',
  interests text[] not null default '{}',
  niche_source text not null default 'manual',
  caption_preset text not null default 'hormozi',
  default_gameplay text not null default 'minecraft',
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists updated_at timestamptz not null default now();

alter table public.profiles drop constraint if exists profiles_niche_fkey;
alter table public.profiles
  add constraint profiles_niche_fkey
  foreign key (niche) references public.niches (id);

alter table public.profiles drop constraint if exists profiles_platforms_check;
alter table public.profiles
  add constraint profiles_platforms_check
  check (platforms <@ array['youtube', 'tiktok', 'instagram']::text[]);

alter table public.profiles drop constraint if exists profiles_niche_source_check;
alter table public.profiles
  add constraint profiles_niche_source_check
  check (niche_source in ('manual', 'picked'));

alter table public.profiles drop constraint if exists profiles_caption_preset_check;
alter table public.profiles
  add constraint profiles_caption_preset_check
  check (caption_preset in ('hormozi', 'clean', 'karaoke'));

alter table public.profiles drop constraint if exists profiles_gameplay_check;
alter table public.profiles
  add constraint profiles_gameplay_check
  check (default_gameplay in ('gta', 'minecraft', 'subway', 'none'));

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- F. Video cache (YouTube metadata)
--    JSON: chapters = [{ start: number, title: string }]
-- ---------------------------------------------------------------------------
create table if not exists public.video_cache (
  video_id text primary key,
  title text not null,
  channel text not null,
  duration_s int not null default 0,
  thumbnail_url text not null default '',
  published_at timestamptz,
  chapters jsonb,
  captions_available boolean not null default true,
  fetched_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.video_cache
  add column if not exists captions_available boolean not null default true;
alter table public.video_cache
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists video_cache_set_updated_at on public.video_cache;
create trigger video_cache_set_updated_at
  before update on public.video_cache
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- G. Transcript cache
--    JSON: segments = [{ start, end, text, words? }]
--          words    = [{ start, end, text }]
-- ---------------------------------------------------------------------------
create table if not exists public.transcript_cache (
  video_id text primary key,
  language text not null default 'en',
  segments jsonb not null default '[]',
  words jsonb not null default '[]',
  source text not null default 'captions',
  fetched_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.transcript_cache
  add column if not exists words jsonb not null default '[]';
alter table public.transcript_cache
  add column if not exists updated_at timestamptz not null default now();

alter table public.transcript_cache drop constraint if exists transcript_cache_source_check;
alter table public.transcript_cache
  add constraint transcript_cache_source_check
  check (source in ('captions', 'none'));

drop trigger if exists transcript_cache_set_updated_at on public.transcript_cache;
create trigger transcript_cache_set_updated_at
  before update on public.transcript_cache
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- H. Analysis cache (scored clips, keyed by video + rubric version)
--    JSON: candidates = ClipCandidate[]
--          events     = AgentEvent[]
--          video      = VideoMeta
-- ---------------------------------------------------------------------------
create table if not exists public.analysis_cache (
  id uuid primary key default gen_random_uuid(),
  video_id text not null,
  rubric_version text not null,
  niche text,
  candidates jsonb not null default '[]',
  events jsonb not null default '[]',
  video jsonb,
  model text,
  source text,
  tokens int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (video_id, rubric_version)
);

alter table public.analysis_cache
  add column if not exists niche text;
alter table public.analysis_cache
  add column if not exists events jsonb not null default '[]';
alter table public.analysis_cache
  add column if not exists video jsonb;
alter table public.analysis_cache
  add column if not exists source text;
alter table public.analysis_cache
  add column if not exists tokens int not null default 0;
alter table public.analysis_cache
  add column if not exists updated_at timestamptz not null default now();

alter table public.analysis_cache drop constraint if exists analysis_cache_niche_fkey;
alter table public.analysis_cache
  add constraint analysis_cache_niche_fkey
  foreign key (niche) references public.niches (id);

alter table public.analysis_cache drop constraint if exists analysis_cache_source_check;
alter table public.analysis_cache
  add constraint analysis_cache_source_check
  check (source is null or source in ('llm', 'heuristic'));

drop trigger if exists analysis_cache_set_updated_at on public.analysis_cache;
create trigger analysis_cache_set_updated_at
  before update on public.analysis_cache
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- I. Discovery cache (today's Ideas feed)
--    JSON: video = VideoMeta
-- ---------------------------------------------------------------------------
create table if not exists public.discovery_cache (
  id uuid primary key default gen_random_uuid(),
  niche text not null,
  for_date date not null,
  video_id text not null,
  score int not null default 0,
  why_it_clips text not null default '',
  hook text not null default '',
  video jsonb,
  estimated_clip_count int not null default 3,
  platforms text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (niche, for_date, video_id)
);

alter table public.discovery_cache
  add column if not exists created_at timestamptz not null default now();
alter table public.discovery_cache
  add column if not exists updated_at timestamptz not null default now();

alter table public.discovery_cache drop constraint if exists discovery_cache_niche_fkey;
alter table public.discovery_cache
  add constraint discovery_cache_niche_fkey
  foreign key (niche) references public.niches (id);

alter table public.discovery_cache drop constraint if exists discovery_cache_platforms_check;
alter table public.discovery_cache
  add constraint discovery_cache_platforms_check
  check (platforms <@ array['youtube', 'tiktok', 'instagram']::text[]);

alter table public.discovery_cache drop constraint if exists discovery_cache_score_check;
alter table public.discovery_cache
  add constraint discovery_cache_score_check
  check (score between 0 and 100);

drop trigger if exists discovery_cache_set_updated_at on public.discovery_cache;
create trigger discovery_cache_set_updated_at
  before update on public.discovery_cache
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- J. Discovery quota (YouTube search.list cap)
-- ---------------------------------------------------------------------------
create table if not exists public.discovery_quota (
  day date primary key,
  search_count int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.discovery_quota
  add column if not exists updated_at timestamptz not null default now();

alter table public.discovery_quota drop constraint if exists discovery_quota_count_check;
alter table public.discovery_quota
  add constraint discovery_quota_count_check
  check (search_count >= 0);

drop trigger if exists discovery_quota_set_updated_at on public.discovery_quota;
create trigger discovery_quota_set_updated_at
  before update on public.discovery_quota
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- K. Clip jobs (Studio → Library)
--    JSON: candidate         = ClipCandidate
--          composition_spec  = CompositionSpec
--          video             = VideoMeta
-- ---------------------------------------------------------------------------
create table if not exists public.clip_jobs (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  video_id text not null,
  candidate jsonb not null,
  composition_spec jsonb not null,
  video jsonb,
  status text not null default 'saved',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.clip_jobs
  add column if not exists updated_at timestamptz not null default now();

alter table public.clip_jobs drop constraint if exists clip_jobs_status_check;
alter table public.clip_jobs
  add constraint clip_jobs_status_check
  check (status in ('preview', 'queued', 'saved'));

drop trigger if exists clip_jobs_set_updated_at on public.clip_jobs;
create trigger clip_jobs_set_updated_at
  before update on public.clip_jobs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- L. Indexes
-- ---------------------------------------------------------------------------
create index if not exists clip_jobs_user_created_idx
  on public.clip_jobs (user_id, created_at desc);

create index if not exists clip_jobs_video_idx
  on public.clip_jobs (video_id);

create index if not exists discovery_cache_feed_idx
  on public.discovery_cache (for_date, niche, score desc);

create index if not exists discovery_cache_video_idx
  on public.discovery_cache (video_id);

create index if not exists analysis_cache_video_idx
  on public.analysis_cache (video_id, rubric_version);

create index if not exists video_cache_fetched_idx
  on public.video_cache (fetched_at desc);

create index if not exists profiles_niche_idx
  on public.profiles (niche);

-- ---------------------------------------------------------------------------
-- M. Row level security
-- ---------------------------------------------------------------------------
alter table public.niches enable row level security;
alter table public.formats enable row level security;
alter table public.profiles enable row level security;
alter table public.video_cache enable row level security;
alter table public.transcript_cache enable row level security;
alter table public.analysis_cache enable row level security;
alter table public.discovery_cache enable row level security;
alter table public.discovery_quota enable row level security;
alter table public.clip_jobs enable row level security;

do $$
begin
  perform public.drop_policies('niches');
  perform public.drop_policies('formats');
  perform public.drop_policies('profiles');
  perform public.drop_policies('video_cache');
  perform public.drop_policies('transcript_cache');
  perform public.drop_policies('analysis_cache');
  perform public.drop_policies('discovery_cache');
  perform public.drop_policies('discovery_quota');
  perform public.drop_policies('clip_jobs');
end;
$$;

-- Catalogs: anyone can read, nobody writes from the client.
create policy "niches_select" on public.niches
  for select using (true);

create policy "formats_select" on public.formats
  for select using (true);

-- Profile: owner-only.
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_delete_own" on public.profiles
  for delete using (auth.uid() = id);

-- Shared caches: public read (Ideas feed + studio cache hits),
-- authenticated write (Next.js API uses the user session, not service role).
create policy "video_cache_select" on public.video_cache
  for select using (true);
create policy "video_cache_write" on public.video_cache
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "transcript_cache_select" on public.transcript_cache
  for select using (true);
create policy "transcript_cache_write" on public.transcript_cache
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "analysis_cache_select" on public.analysis_cache
  for select using (true);
create policy "analysis_cache_write" on public.analysis_cache
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "discovery_cache_select" on public.discovery_cache
  for select using (true);
create policy "discovery_cache_write" on public.discovery_cache
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "discovery_quota_all" on public.discovery_quota
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Library: owner-only.
create policy "clip_jobs_select_own" on public.clip_jobs
  for select using (auth.uid() = user_id);
create policy "clip_jobs_insert_own" on public.clip_jobs
  for insert with check (auth.uid() = user_id);
create policy "clip_jobs_update_own" on public.clip_jobs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "clip_jobs_delete_own" on public.clip_jobs
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- N. Auth → profile trigger
-- ---------------------------------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- O. Grants
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;

revoke all on table
  public.niches,
  public.formats,
  public.profiles,
  public.video_cache,
  public.transcript_cache,
  public.analysis_cache,
  public.discovery_cache,
  public.discovery_quota,
  public.clip_jobs
from anon, authenticated;

grant select on public.niches to anon, authenticated, service_role;
grant select on public.formats to anon, authenticated, service_role;

grant select, insert, update, delete on public.profiles to authenticated, service_role;
grant select, insert, update, delete on public.clip_jobs to authenticated, service_role;

grant select on public.video_cache to anon, authenticated, service_role;
grant insert, update, delete on public.video_cache to authenticated, service_role;

grant select on public.transcript_cache to anon, authenticated, service_role;
grant insert, update, delete on public.transcript_cache to authenticated, service_role;

grant select on public.analysis_cache to anon, authenticated, service_role;
grant insert, update, delete on public.analysis_cache to authenticated, service_role;

grant select on public.discovery_cache to anon, authenticated, service_role;
grant insert, update, delete on public.discovery_cache to authenticated, service_role;

grant select, insert, update, delete on public.discovery_quota to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- P. Comments (JSON shapes match lib/agent/types.ts)
-- ---------------------------------------------------------------------------
comment on table public.niches is 'Static niche catalog used by onboarding, settings, and discovery.';
comment on table public.formats is 'Clip formats stored on profiles.interests (storytelling, debate, …).';
comment on table public.profiles is 'One row per auth user. Created by handle_new_user(); updated by /api/profile.';
comment on column public.profiles.platforms is 'Subset of {youtube, tiktok, instagram}.';
comment on column public.profiles.niche_source is 'manual | picked';
comment on column public.profiles.caption_preset is 'hormozi | clean | karaoke';
comment on column public.profiles.default_gameplay is 'gta | minecraft | subway | none';

comment on table public.video_cache is 'YouTube metadata keyed by video_id.';
comment on column public.video_cache.chapters is '[{ "start": number, "title": string }]';

comment on table public.transcript_cache is 'Caption segments and exploded word timings.';
comment on column public.transcript_cache.segments is '[{ "start": number, "end": number, "text": string }]';
comment on column public.transcript_cache.words is '[{ "start": number, "end": number, "text": string }]';
comment on column public.transcript_cache.source is 'captions | none';

comment on table public.analysis_cache is 'Scored clip candidates, unique on (video_id, rubric_version).';
comment on column public.analysis_cache.candidates is 'ClipCandidate[]: { id, start, end, hook, whyItClips, score, scores, captionLines }';
comment on column public.analysis_cache.events is 'AgentEvent[]: { stage, message, at }';
comment on column public.analysis_cache.video is 'VideoMeta';
comment on column public.analysis_cache.source is 'llm | heuristic';

comment on table public.discovery_cache is 'Daily Ideas feed, unique on (niche, for_date, video_id).';
comment on column public.discovery_cache.video is 'VideoMeta';
comment on table public.discovery_quota is 'YouTube search.list counter. App cap is 80 searches/day.';

comment on table public.clip_jobs is 'Saved Studio cuts. Owner-scoped via user_id.';
comment on column public.clip_jobs.candidate is 'ClipCandidate';
comment on column public.clip_jobs.composition_spec is 'CompositionSpec: { videoId, start, end, gameplay, captionPreset, captionLines }';
comment on column public.clip_jobs.video is 'VideoMeta';
comment on column public.clip_jobs.status is 'preview | queued | saved';

comment on function public.handle_new_user() is 'Inserts a profiles row when a new auth.users row is created.';
comment on function public.set_updated_at() is 'BEFORE UPDATE trigger: sets NEW.updated_at = now().';

drop function if exists public.drop_policies(text);
