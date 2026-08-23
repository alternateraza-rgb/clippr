# This Mac as the worker for everyone

Users paste a link on Clipmuse; this machine does the downloading, transcribing,
and rendering. It works because a home connection is a residential IP, which is
the one thing YouTube does not block — see [DOWNLOADS.md](DOWNLOADS.md).

Two launchd services do the work. They start on login, restart on crash, and
hold off idle sleep while running. No sudo, no Homebrew.

## Already installed on this machine

- **yt-dlp 2026.8.19** via `uv tool install` → `~/.local/bin/yt-dlp`
- **ffmpeg 7.1** from the `imageio-ffmpeg` package → symlinked to `~/.local/bin/ffmpeg`
- `~/.local/bin` on `PATH` via `~/.zshrc`

On a different Mac, redo those first — the services shell out by name.

## Setup, once

**1. Fill in `.env.local`.** It exists with five `PASTE_` placeholders and says
where each value comes from. It is gitignored.

**2. Get the ngrok pieces** at [dashboard.ngrok.com](https://dashboard.ngrok.com):
your authtoken, and a free static domain from the Domains tab. The domain is
what makes this survivable — without it, every restart mints a new URL and
Vercel needs editing before clips work again.

**3. Install the services:**

```bash
npm run service:install
```

**4. Point Vercel at it.** Set `CLIP_WORKER_URL` to `https://your-name.ngrok-free.app`
(no trailing slash) and confirm `CLIP_WORKER_SECRET` matches `.env.local` exactly.
Redeploy.

**5. Pause the Render worker.** Both poll the same Supabase queue every 45
seconds, so leaving it running means Render steals jobs and fails them on its
blocked IP.

## Checking it

```bash
curl localhost:8787/health
```

Wants `"ffmpeg":true`, a current `"ytdlp"`, and `"apify":false` — that last one
is deliberate. No `APIFY_TOKEN` means `ytdlpFirst()` is true, so downloads use
this machine's own IP rather than a blocked datacenter.

Then the same through the tunnel, which is what Vercel actually calls:

```bash
curl https://your-name.ngrok-free.app/health
```

The app's Settings page reports the same thing without a terminal.

## Running it

```bash
npm run service:logs        # both services, live
npm run service:uninstall   # stop and remove
npm run service:install     # reinstall, and how you restart after editing .env.local
```

Logs are at `~/Library/Logs/clipmuse/`. Env changes need a restart — the files
are read once at process start.

## What takes it down

- **Closing the lid.** `caffeinate -i` blocks *idle* sleep only; a closed lid
  sleeps anyway unless the Mac is on power with an external display.
- **Losing internet**, obviously. The tunnel reconnects on its own; in-flight
  renders fail and get requeued after 20 minutes by `drainQueued`.
- **Reboots** are fine — both services come back at login. An unattended reboot
  that stops at the login window is not; nothing runs until someone logs in.

This is one laptop. When it is off, Studio export and transcription are down for
every user. That is the tradeoff against a residential proxy on Render.
