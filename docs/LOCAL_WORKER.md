# Home worker (your PC downloads YouTube)

Users only paste a link on Clipmuse. **Your computer** runs yt-dlp. Pause Render so YouTube is not hit from a datacenter IP.

## Once on this machine

1. Install **Node**, **yt-dlp**, and **ffmpeg**
   - macOS: `brew install yt-dlp ffmpeg`
   - Windows: `winget install yt-dlp.yt-dlp Gyan.FFmpeg`
2. Put secrets in `.env.local` (repo root). Need:
   - `CLIP_WORKER_SECRET` — same value as Vercel
   - `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
   - `LLM_API_KEY` or `OPENAI_API_KEY`
   - `PORT=8787`
3. From the repo: `npm install`

## Every time you clip (two terminals)

```bash
npm run worker
```

```bash
npm run worker:tunnel
```

Copy the `https://….trycloudflare.com` URL (no trailing slash).

On **Vercel** set `CLIP_WORKER_URL` to that URL and `CLIP_WORKER_SECRET` to the same secret. Redeploy. Pause the Render service.

Check: `curl https://YOUR-TUNNEL/health` → `{"ok":true,...}`

Quick tunnels **change URL when you restart** `cloudflared`. Update Vercel each time, or use a named Cloudflare tunnel later.

Keep the laptop awake. If this process is down, Studio transcribe/export fails for everyone.
