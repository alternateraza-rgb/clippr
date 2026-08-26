-- =============================================================================
-- Clipmuse 005 — deletable clips, and posters that can actually be stored
-- Safe to re-run
-- =============================================================================

-- 1. clip_renders was granted DELETE in 002 but never given a row-level policy
-- to go with it, and RLS is on. Under that combination a delete from the
-- `authenticated` role does not fail — it matches zero rows and reports
-- success, so the app believed clips were being removed while nothing changed.
-- Its sibling tables (profiles, clip_jobs) and the clips bucket all have one.
drop policy if exists "clip_renders_delete_own" on public.clip_renders;
create policy "clip_renders_delete_own" on public.clip_renders
  for delete using (auth.uid() = user_id);

-- 2. The worker writes a poster frame beside each clip as
-- {user_id}/{render_id}.jpg with contentType image/jpeg, but the clips bucket
-- has only ever allowed video and audio types. Storage rejected every one of
-- those uploads; the worker caught it, logged "no poster frame", and carried
-- on — which is why clips have no poster to show in the library grid.
update storage.buckets
set allowed_mime_types = array[
  'video/mp4',
  'video/webm',
  'audio/mpeg',
  'audio/wav',
  'audio/webm',
  'audio/mp4',
  'image/jpeg'
]
where id = 'clips';
