# Clipmuse

Premium clipping studio. Paste a YouTube URL; the agent reads the transcript, scores high-retention moments, and previews a captioned 9:16 cut.

```bash
cp .env.example .env.local   # add LLM_API_KEY and YOUTUBE_API_KEY
npm install
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000).

```bash
npm run spike                # prove transcript + scoring on real videos
```

## Env

| Key | Purpose |
|---|---|
| `LLM_API_KEY` | OpenAI or Anthropic. Missing → heuristic scorer |
| `LLM_PROVIDER` | `openai` (default) or `anthropic` |
| `YOUTUBE_API_KEY` | `videos.list` + discovery search. Missing → oEmbed titles |
| `NEXT_PUBLIC_SUPABASE_URL` | Auth, profiles, caches, jobs. Missing → localStorage, no gate |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key from Supabase → Settings → API |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin for auth email links (optional; defaults to the request host) |
| `ENABLE_LOCAL_EXPORT` | `true` to render mp4 via yt-dlp + ffmpeg |
| `CLIPMUSE_MODE` | `demo` forces fixtures; `live` is default |

Apply the complete A–Z schema in the Supabase SQL editor (safe to re-run):

[`supabase/migrations/001_init.sql`](supabase/migrations/001_init.sql)

That file creates every table this app uses — profiles, niche/format catalogs, video/transcript/analysis caches, discovery feed + quota, and clip jobs — plus indexes, RLS, grants, and the auth trigger that inserts a profile on signup.

In the Supabase dashboard, set **Authentication → URL configuration**:

- Site URL: `http://127.0.0.1:3000` (or your deployed origin)
- Redirect URLs: `http://127.0.0.1:3000/auth/callback` and `http://127.0.0.1:3000/auth/confirm` (add `localhost` variants if you use that host)
- For local testing, Authentication → Providers → Email → turn **Confirm email** off, or leave it on and use the “check your email” path after signup

Use the same host everywhere (`127.0.0.1` vs `localhost`). Mixing them drops the session cookie.

Refresh today's Ideas feed (uses ~1 search per niche, capped at 80/day):

```bash
curl -X POST http://127.0.0.1:3000/api/discovery/refresh
```
