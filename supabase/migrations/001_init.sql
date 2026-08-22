-- Clipmuse schema + RLS
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
  created_at timestamptz not null default now()
);

create table if not exists public.video_cache (
  video_id text primary key,
  title text not null,
  channel text not null,
  duration_s int not null default 0,
  thumbnail_url text not null default '',
  published_at timestamptz,
  chapters jsonb,
  fetched_at timestamptz not null default now()
);

create table if not exists public.transcript_cache (
  video_id text primary key,
  language text not null default 'en',
  segments jsonb not null default '[]',
  source text not null default 'captions',
  fetched_at timestamptz not null default now()
);

create table if not exists public.analysis_cache (
  id uuid primary key default gen_random_uuid(),
  video_id text not null,
  rubric_version text not null,
  candidates jsonb not null default '[]',
  model text,
  created_at timestamptz not null default now(),
  unique (video_id, rubric_version)
);

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
  unique (niche, for_date, video_id)
);

create table if not exists public.discovery_quota (
  day date primary key,
  search_count int not null default 0
);

create table if not exists public.clip_jobs (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  video_id text not null,
  candidate jsonb not null,
  composition_spec jsonb not null,
  video jsonb,
  status text not null default 'saved',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.video_cache enable row level security;
alter table public.transcript_cache enable row level security;
alter table public.analysis_cache enable row level security;
alter table public.discovery_cache enable row level security;
alter table public.discovery_quota enable row level security;
alter table public.clip_jobs enable row level security;

create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "read caches" on public.video_cache for select using (true);
create policy "read transcripts" on public.transcript_cache for select using (true);
create policy "read analyses" on public.analysis_cache for select using (true);
create policy "read discovery" on public.discovery_cache for select using (true);

create policy "own jobs" on public.clip_jobs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "auth write discovery" on public.discovery_cache
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "auth quota" on public.discovery_quota
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
