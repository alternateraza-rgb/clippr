-- =============================================================================
-- Clipmuse 008 — retire fabricated transcripts, stop a crash on the fallback
-- Safe to re-run
-- =============================================================================

-- A. Purge fabricated timelines
--
-- Supadata's plain-text branch used to answer a request for a transcript by
-- inventing one: a single segment spanning the whole tape, with every word
-- interpolated linearly across it. Word timestamps landed minutes from the
-- words they named, which is far outside what any downstream correction is
-- built for — the quote anchor's hint, the sentence snap, and the download pad
-- all assume single-digit-second error.
--
-- The producer is gone. This clears what it already wrote, because
-- transcript_cache is keyed on video_id alone with no version and no
-- provenance: without this delete, every affected video keeps serving the
-- fabricated row forever and the fix is invisible.
--
-- The signature is the shape itself. A real caption track for a video longer
-- than two minutes is hundreds of cues; one or two cues covering that runtime
-- can only have been fabricated. The reader rejects the same shape, so this is
-- an optimisation — it saves the first read after deploy from missing — not the
-- guard itself.
-- The type guards are not decoration: jsonb_array_length errors on a non-array
-- and the numeric cast errors on a non-number, either of which would abort the
-- whole migration over one malformed row.
delete from public.transcript_cache
where jsonb_typeof(segments) = 'array'
  and jsonb_array_length(segments) <= 2
  and coalesce(
    (select max((seg ->> 'end')::numeric)
       from jsonb_array_elements(segments) as seg
      where jsonb_typeof(seg -> 'end') = 'number'),
    0
  ) > 120;

-- B. Let the caption fallback actually fall back
--
-- render.ts sets asr_source = 'captions-approx' when Whisper fails twice and
-- the clip has to ship with approximate caption timings. The existing check
-- allowed only 'captions' and 'whisper', so writing that status raised a
-- constraint violation and killed the whole render — on the code path whose
-- entire purpose is to degrade gracefully rather than fail.
alter table public.clip_renders drop constraint if exists clip_renders_asr_check;
alter table public.clip_renders
  add constraint clip_renders_asr_check
  check (asr_source is null or asr_source in ('captions', 'captions-approx', 'whisper'));
