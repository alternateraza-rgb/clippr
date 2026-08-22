# Clipmuse live product

App stays on **Vercel**. YouTube ingest is **cloud APIs**: Supadata for transcripts, Apify for file download. Render only burns ffmpeg — it should not talk to youtube.com. OpenAI is the brain.

## Loop

1. Onboard → bootstrap `user_feed` from OpenAI search queries + YouTube `search.list`
2. Home / Ideas show 8+ minute videos ranked for clip potential
3. Paste or click → Studio analyzes
4. Captions: scrape on Vercel first; if that fails, **Supadata** (cloud). OpenAI scores the real transcript.
5. OpenAI scores windows against the retention rubric (never a fake **52 / 0:00–0:24 / “No transcript”** card)
6. Preview 9:16 Hormozi / clean / karaoke captions; optional gameplay from the public `gameplay` bucket
7. Export enqueues `clip_renders` → **Apify** downloads the file → Render ffmpeg burns ASS, stacks gameplay, uploads to `clips`

## Why Studio used to show 52

Vercel datacenter IPs usually cannot scrape YouTube timedtext. The old agent then invented a stub candidate (`nc-1`, score 52, first 24 seconds) and wrote `transcript_cache.source = 'none'`. Every retry was an instant cache hit, so OpenAI never ran.

That stub is **gone**. Empty / `none` cache rows are treated as misses. Poison stub analyses (`nc-1`) are ignored. Paste SQL `004_transcribe_jobs.sql` to delete leftover poison rows.

## Transcribe

Analyze uses Supadata when YouTube blocks Vercel. Large videos may return a job id; we poll for about 80s. Worker `/transcribe` is a fallback only.

## Keys

- **Vercel:** `LLM_API_KEY` or `OPENAI_API_KEY`, `YOUTUBE_API_KEY`, Supabase URL + anon + service role, `SUPADATA_API_KEY`, `CLIP_WORKER_URL`, `CLIP_WORKER_SECRET`
- **Render:** same worker secret, Supabase, LLM key, **`APIFY_TOKEN`**, optional `SUPADATA_API_KEY`

Redeploy **Vercel and Render** after pulling this branch.

## After deploy

1. Redeploy Vercel (this branch) and Render (worker image)
2. Paste `004` (and `003` if the bucket is missing)
3. Confirm Settings → Connections shows LLM, YouTube, Supadata, Apify, worker
4. Paste an **8+ minute** video in Studio

## Captions

Hormozi is boxed word-pop (preview CSS + ASS `\t` scale + karaoke `\k`), not Remotion. Clean and karaoke remain. CapCut spring/3D is out of scope; the burned mp4 is ffmpeg ASS.

## Gameplay

Do **not** commit or rip GTA/Minecraft. Upload your own / licensed `minecraft.mp4`, `gta.mp4`, `subway.mp4` to Storage bucket `gameplay` (`003_gameplay.sql`). Preview uses the public object URL; ffmpeg `vstack`s it on export. CSS loops are fallback only.

## SQL (Supabase editor, in order)

1. `001_init.sql`
2. `002_renders.sql`
3. `003_gameplay.sql`
4. `004_transcribe_jobs.sql` — jobs table + delete poison cache
