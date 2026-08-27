-- =============================================================================
-- Clipmuse 007 — record where each clip's bytes live
-- Safe to re-run
-- =============================================================================

-- Clips are moving to Cloudflare R2, where egress is free. Existing clips stay
-- in Supabase Storage, so a read has to know which store to ask. Recorded per
-- render rather than inferred: probing both on every request would cost a round
-- trip to be told something the writer already knew.
--
-- Defaults to 'supabase' so every row written before this migration is correct
-- without a backfill.
alter table public.clip_renders
  add column if not exists storage text not null default 'supabase';

alter table public.clip_renders drop constraint if exists clip_renders_storage_check;
alter table public.clip_renders
  add constraint clip_renders_storage_check
  check (storage in ('supabase', 'r2'));
