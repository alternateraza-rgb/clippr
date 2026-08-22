# Clipmuse live product

App stays on **Vercel**. YouTube download runs on a **home worker** (`npm run worker` + tunnel) because Render datacenter IPs get YouTube’s bot check. OpenAI is the brain. YouTube Data API finds longform. After onboarding, Home is a researched feed — not fixtures.

## Loop

1. Onboard → bootstrap `user_feed` from OpenAI search queries + YouTube `search.list`
2. Home / Ideas show 8+ minute videos ranked for clip potential
3. Paste or click → Studio analyzes
4. Captions: scrape on Vercel first; if that fails, **Render transcribes** (auto-subs, else Whisper on the first 10 minutes)
5. OpenAI scores windows against the retention rubric (never a fake **52 / 0:00–0:24 / “No transcript”** card)
6. Preview 9:16 Hormozi / clean / karaoke captions; optional gameplay from the public `gameplay` bucket
7. Export enqueues `clip_renders` → worker downloads the section, burns ASS, stacks gameplay if present, uploads to private `clips`

## Why Studio used to show 52

Vercel datacenter IPs usually cannot scrape YouTube timedtext. The old agent then invented a stub candidate (`nc-1`, score 52, first 24 seconds) and wrote `transcript_cache.source = 'none'`. Every retry was an instant cache hit, so OpenAI never ran.

That stub is **gone**. Empty / `none` cache rows are treated as misses. Poison stub analyses (`nc-1`) are ignored. Paste SQL `004_transcribe_jobs.sql` to delete leftover poison rows.

## Transcribe (does not fit in one Vercel request)

Whisper on 10 minutes of audio plus a sleeping Render instance takes **minutes**, not the ~60s Studio used to wait on the analyze stream.

- Analyze kicks `POST /transcribe` and waits only a few seconds (fast auto-subs / warm cache)
- If words are not ready, the stream yields **`pending`**
- Studio **polls** `GET /api/studio/transcript` (up to 10 minutes) while the worker writes `transcribe_jobs` + `transcript_cache`
- Then Studio re-runs analyze, which scores the real transcript

## Keys

| Where | Keys |
|---|---|
| Vercel | `LLM_API_KEY` **or** `OPENAI_API_KEY` (same `sk-`; brain accepts either), `YOUTUBE_API_KEY`, Supabase URL + anon + **service role**, `CLIP_WORKER_URL` (Render origin, no slash), `CLIP_WORKER_SECRET` |
| Render | **Same** `CLIP_WORKER_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `LLM_API_KEY` or `OPENAI_API_KEY` (Whisper) |

`CLIP_WORKER_SECRET` must match on both sides. Redeploy **Vercel and Render** after pulling this branch.

## Captions

Hormozi is boxed word-pop (preview CSS + ASS `\t` scale + karaoke `\k`), not Remotion. Clean and karaoke remain. CapCut spring/3D is out of scope; the burned mp4 is ffmpeg ASS.

## Gameplay

Do **not** commit or rip GTA/Minecraft. Upload your own / licensed `minecraft.mp4`, `gta.mp4`, `subway.mp4` to Storage bucket `gameplay` (`003_gameplay.sql`). Preview uses the public object URL; ffmpeg `vstack`s it on export. CSS loops are fallback only.

## SQL (Supabase editor, in order)

1. `001_init.sql`
2. `002_renders.sql`
3. `003_gameplay.sql`
4. `004_transcribe_jobs.sql` — jobs table + delete poison cache

## After deploy

1. Redeploy Vercel (this branch) and Render (worker image)
2. Paste `004` (and `003` if the bucket is missing)
3. Confirm Settings → Connections shows LLM, YouTube, and worker
4. Paste an **8+ minute** video in Studio — timeline should show worker/Whisper, then real timestamps
