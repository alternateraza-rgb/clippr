# Clipmuse

Premium clipping studio. Paste a YouTube URL; the agent reads the transcript, scores high-retention moments, and previews a captioned 9:16 cut. Home/Ideas are live YouTube longform ranked by OpenAI. Export burns captions into an mp4 on a Render worker.

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000).

```bash
npm run spike                # prove transcript + scoring on real videos
npm run worker               # local render worker (needs yt-dlp + ffmpeg)
```

## Env

| Key | Purpose |
|---|---|
| `LLM_API_KEY` | OpenAI (or Anthropic). Brain + worker. `OPENAI_API_KEY` is accepted as an alias. |
| `OPENAI_API_KEY` | Optional alias for the same `sk-` key |
| `YOUTUBE_API_KEY` | `search.list` + `videos.list`. Required for a live Ideas feed |
| `NEXT_PUBLIC_SUPABASE_URL` | Auth, profiles, caches, jobs, renders |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key from Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Cron + cache writes without a user session. Required for daily discovery |
| `SUPABASE_URL` | Same project URL; worker can use this instead of the `NEXT_PUBLIC_` key |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin for auth email links |
| `CRON_SECRET` | If set, `/api/discovery/refresh` requires `Authorization: Bearer …` (Vercel Cron sends this) |
| `CLIP_WORKER_URL` | Public URL of the Render worker, no trailing slash |
| `CLIP_WORKER_SECRET` | Shared secret. Same value on Vercel and Render |
| `ENABLE_LOCAL_EXPORT` | `true` to render an mp4 on this machine when the worker is not configured |
| `CLIPMUSE_MODE` | `demo` forces fixtures; `live` is default |

## Supabase SQL

Paste these in the SQL editor (safe to re-run), in order:

1. [`supabase/migrations/001_init.sql`](supabase/migrations/001_init.sql)
2. [`supabase/migrations/002_renders.sql`](supabase/migrations/002_renders.sql)
3. [`supabase/migrations/003_gameplay.sql`](supabase/migrations/003_gameplay.sql) — public `gameplay` bucket. Upload `minecraft.mp4`, `gta.mp4`, `subway.mp4` (your own / licensed loops).

In the Supabase dashboard, set **Authentication → URL configuration**:

- Site URL: `http://127.0.0.1:3000` (or your deployed origin)
- Redirect URLs: `http://127.0.0.1:3000/auth/callback` and `http://127.0.0.1:3000/auth/confirm` (add `localhost` variants if you use that host)
- For local testing, Authentication → Providers → Email → turn **Confirm email** off, or leave it on and use the “check your email” path after signup

Use the same host everywhere (`127.0.0.1` vs `localhost`). Mixing them drops the session cookie.

## Render worker

The Next.js app stays on Vercel. Export cannot run yt-dlp/ffmpeg there. Deploy `worker/Dockerfile` as a **Render Web Service** (Docker, root directory = repo root, Dockerfile path `worker/Dockerfile`).

1. Create the service from this repo
2. Set `CLIP_WORKER_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `LLM_API_KEY` (or `OPENAI_API_KEY`)
3. On Vercel, set `CLIP_WORKER_URL` to the Render URL (e.g. `https://clipmuse-worker.onrender.com`) and the same `CLIP_WORKER_SECRET`

Free Render instances sleep. The first export after idle can take a minute; Studio polls Library until the mp4 is ready. The worker also drains queued jobs on boot.

The worker also handles Studio transcribe (`POST /transcribe`) when Vercel cannot scrape YouTube captions. Redeploy Render after pulling this commit.

Health check: `GET /health`.

## Discovery

Onboarding stocks your niche feed (`POST /api/discovery/bootstrap`). Vercel Cron hits `/api/discovery/refresh` daily (`vercel.json`, 07:00 UTC) and writes `discovery_cache` plus each onboarded user’s `user_feed`. Cap is 80 YouTube searches/day.

```bash
curl -X POST http://127.0.0.1:3000/api/discovery/refresh
```
