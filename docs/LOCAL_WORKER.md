# Home worker (your PC downloads YouTube)

For why the hosted worker gets blocked at all, and the residential-proxy setup
that fixes it without a laptop, see [DOWNLOADS.md](DOWNLOADS.md).

Users only paste a link on Clipmuse. **Your computer** runs yt-dlp. Pause Render so YouTube is not hit from a datacenter IP.

## Once on this machine

1. Install **Node**, **yt-dlp**, and **ffmpeg**
   - macOS with Homebrew: `brew install yt-dlp ffmpeg`
   - macOS without Homebrew (no sudo needed):
     `pip3 install --user uv && uv tool install yt-dlp` puts yt-dlp in
     `~/.local/bin`; `pip3 install --user imageio-ffmpeg` ships an ffmpeg binary
     you can symlink there too. Add `~/.local/bin` to `PATH` in `~/.zshrc` —
     the worker shells out by name, so it has to be on `PATH`, not just installed.
   - Windows: `winget install yt-dlp.yt-dlp Gyan.FFmpeg`

   **yt-dlp must be current.** It needs Python 3.10+, so a Mac using Xcode's
   bundled Python 3.9 silently pins you to an old release that YouTube already
   rejects. `yt-dlp --version` should be within a few weeks of today.
2. Put secrets in `.env.local` (repo root). Need:
   - `CLIP_WORKER_SECRET` — same value as Vercel
   - `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
   - `LLM_API_KEY` or `OPENAI_API_KEY`
   - `PORT=8787`
   - `YTDLP_FIRST=true` — download with local yt-dlp instead of Apify. (Not needed
     if you leave `APIFY_TOKEN` unset here; yt-dlp is used automatically then.)
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

If a download still fails, run `yt-dlp -U`. yt-dlp breaks whenever YouTube changes
something, and an old version looks exactly like a block.

Keep the laptop awake. If this process is down, Studio transcribe/export fails for everyone.
