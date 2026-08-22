# Clipmuse

Premium clipping studio. Paste a YouTube URL; the agent reads the transcript, scores high-retention moments, and previews a captioned 9:16 cut. Home/Ideas are live YouTube longform ranked by OpenAI. Export burns captions into an mp4 on the worker (run it on your PC so YouTube is not blocked).

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
| `CLIP_WORKER_URL` | Public URL of the **home** worker tunnel (or Render). No trailing slash |
| `CLIP_WORKER_SECRET` | Shared secret. Same value on Vercel and the worker |
| `ENABLE_LOCAL_EXPORT` | `true` to render an mp4 on this machine when the worker is not configured |
| `CLIPMUSE_MODE` | `demo` forces fixtures; `live` is default |

## Home worker (YouTube download)

YouTube blocks yt-dlp on Render. Run the worker on your PC and point Vercel at a tunnel. Users still only paste a link on the site. Full steps: [`docs/LOCAL_WORKER.md`](docs/LOCAL_WORKER.md).

```bash
npm run worker          # terminal 1 — needs yt-dlp + ffmpeg
npm run worker:tunnel   # terminal 2 — prints an https URL
```

Set Vercel `CLIP_WORKER_URL` to that URL and pause Render.

## Supabase SQL

Paste these in the SQL editor (safe to re-run), in order:

1. [`supabase/migrations/001_init.sql`](supabase/migrations/001_init.sql)
2. [`supabase/migrations/002_renders.sql`](supabase/migrations/002_renders.sql)
3. [`supabase/migrations/003_gameplay.sql`](supabase/migrations/003_gameplay.sql) — public `gameplay` bucket. Upload `minecraft.mp4`, `gta.mp4`, `subway.mp4` (your own / licensed loops).
4. [`supabase/migrations/004_transcribe_jobs.sql`](supabase/migrations/004_transcribe_jobs.sql) — worker job status + deletes poison `none` / fake-52 cache rows.

In the Supabase dashboard, set **Authentication → URL configuration**:

- Site URL: `http://127.0.0.1:3000` (or your deployed origin)
- Redirect URLs: `http://127.0.0.1:3000/auth/callback` and `http://127.0.0.1:3000/auth/confirm` (add `localhost` variants if you use that host)
- For local testing, Authentication → Providers → Email → turn **Confirm email** off, or leave it on and use the “check your email” path after signup

Use the same host everywhere (`127.0.0.1` vs `localhost`). Mixing them drops the session cookie.

## Render worker (optional)

Do **not** use Render for YouTube download (bot check). Pause that service while the home worker is on. The Docker worker is still in `worker/Dockerfile` if you later run ffmpeg-only jobs on files already in Storage.

Health check: `GET /health`.

## Discovery

Onboarding stocks your niche feed (`POST /api/discovery/bootstrap`). Vercel Cron hits `/api/discovery/refresh` daily (`vercel.json`, 07:00 UTC) and writes `discovery_cache` plus each onboarded user’s `user_feed`. Cap is 80 YouTube searches/day.

```bash
curl -X POST http://127.0.0.1:3000/api/discovery/refresh
```
