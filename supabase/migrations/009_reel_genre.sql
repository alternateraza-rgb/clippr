-- =============================================================================
-- Clipmuse 009 — a genre on every reel, for the Stats page
-- Safe to re-run
-- =============================================================================

-- A. The column
--
-- Genre reuses the niche catalog rather than inventing a second taxonomy: the
-- twelve ids are what onboarding, Ideas and the scorer already speak, and a
-- closed set is what makes a chart of them readable.
--
-- It is nullable on purpose. Reels made before this migration have none until
-- they are classified (lib/stats/genre.ts — lazily when Stats opens, or all at
-- once with scripts/backfill-genres.ts). Null means "not classified yet", never
-- "no genre".
alter table public.clip_renders add column if not exists genre text;

alter table public.clip_renders drop constraint if exists clip_renders_genre_fkey;
alter table public.clip_renders
  add constraint clip_renders_genre_fkey
  foreign key (genre) references public.niches (id);

-- B. Index
--
-- The genre filter on Library and the per-genre breakdown both read one user's
-- reels for one genre.
create index if not exists clip_renders_user_genre_idx
  on public.clip_renders (user_id, genre);
