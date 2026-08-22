-- =============================================================================
-- Clipmuse 004 — transcribe job status + delete poison stub cache
-- Safe to re-run after 001–003
-- =============================================================================

-- Old stub: scrape miss wrote source='none' and a fake 52 / nc-1 analysis.
delete from public.transcript_cache
where source = 'none'
   or words is null
   or coalesce(jsonb_array_length(words), 0) = 0;

delete from public.analysis_cache
where coalesce(candidates->0->>'id', '') = 'nc-1'
   or coalesce(candidates->0->>'hook', '') like 'No transcript%';

create table if not exists public.transcribe_jobs (
  video_id text primary key,
  status text not null default 'queued',
  error text,
  source text,
  word_count int,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.transcribe_jobs drop constraint if exists transcribe_jobs_status_check;
alter table public.transcribe_jobs
  add constraint transcribe_jobs_status_check
  check (status in ('queued', 'running', 'ready', 'failed'));

alter table public.transcribe_jobs drop constraint if exists transcribe_jobs_source_check;
alter table public.transcribe_jobs
  add constraint transcribe_jobs_source_check
  check (source is null or source in ('captions', 'whisper'));

drop trigger if exists transcribe_jobs_set_updated_at on public.transcribe_jobs;
create trigger transcribe_jobs_set_updated_at
  before update on public.transcribe_jobs
  for each row execute function public.set_updated_at();

alter table public.transcribe_jobs enable row level security;
drop policy if exists "transcribe_jobs_select" on public.transcribe_jobs;
drop policy if exists "transcribe_jobs_write" on public.transcribe_jobs;
create policy "transcribe_jobs_select" on public.transcribe_jobs
  for select using (true);
create policy "transcribe_jobs_write" on public.transcribe_jobs
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant select on public.transcribe_jobs to anon, authenticated, service_role;
grant insert, update, delete on public.transcribe_jobs to authenticated, service_role;

comment on table public.transcribe_jobs is 'Render worker progress while downloading captions or Whisper.';
