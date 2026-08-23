# Why YouTube downloads fail, and how this worker gets around it

YouTube blocks **IP addresses**, not requests. Every datacenter — Render, Vercel,
Apify's proxy pool — shares addresses that have been used for scraping, so
downloads from them fail with one of:

```
HTTP Error 403: Forbidden
Sign in to confirm you're not a bot
```

Both mean the same thing. Neither is fixed by signing in.

## What does not fix it

- **Cookies.** They authenticate you; they do not change your IP. The Apify
  actor's own input schema documents `cookiesText` for age-restricted videos
  only. Set `YOUTUBE_COOKIES_TEXT` if you need those, not for a 403.
- **PO tokens.** The bgutil provider used to bypass the bot check. As of 2026 it
  no longer does in most cases.
- **Supadata.** It has no media endpoints — transcripts, metadata, extract and
  web scraping only. `SUPADATA_API_KEY` is still worth setting: it serves
  transcripts without downloading anything, so transcription never hits this
  problem at all. It cannot help rendering.

## What does fix it

A residential exit IP. The worker supports two ways to get one.

### Residential proxy (the deployed answer)

Set on Render:

```
YTDLP_PROXY=http://user:pass@proxy.example.com:12321
```

Any http/https/socks5 URL with inline credentials works. IPRoyal residential is
pay-as-you-go and its traffic never expires; roughly $7 for the first GB.

Setting this also changes provider order — `ytdlpFirst()` in `lib/config.ts`
puts yt-dlp ahead of Apify, since a proxied download is both cheaper and more
reliable than the actor.

**Bandwidth is small by design.** `downloadSource` requests only the clip
window, so a 15-second clip is ~1.3 MB — about 700 clips per GB. The exception
is `whisperWindow` in `worker/src/transcribe.ts`, which pulls 10 minutes of
audio (~18 MB); Supadata normally short-circuits it first.

### Home worker (the escape hatch)

Your own connection is residential, so it needs no proxy at all. See
[LOCAL_WORKER.md](LOCAL_WORKER.md). Use it if proxy credits run out or the pool
gets flagged.

## How downloads actually run

`downloadSource` in `worker/src/media.ts` tries providers in order and returns
the offset of what it got:

1. **yt-dlp**, first when a proxy is set, `YTDLP_FIRST=true`, or Apify is not
   configured. Retries up to 3 times on a block — a rotating residential
   endpoint gives a new exit IP each reconnect — and not at all on other errors.
2. **Apify**, the `datapipe~youtube-video-downloader` actor. Whole videos only,
   so it reports `offset: 0` and the caller cuts from the absolute timestamp.

Every yt-dlp invocation in the repo builds its arguments from
`ytdlpBaseArgs()` in `lib/ingest/ytdlp.ts`, which is what guarantees the proxy,
the player clients, and cookies apply everywhere — including the caption fetch
in `trySubs`, which used to bypass all three.

## Verifying

```bash
curl https://clipmuse-worker.onrender.com/health
```

Expect `"proxy":true`, `"ffmpeg":true`, and a current `"ytdlp"` version.

Then exercise the real download path with a 3-second clip:

```bash
curl -X POST -H "Authorization: Bearer $CLIP_WORKER_SECRET" https://clipmuse-worker.onrender.com/selftest
```

Success looks like `{"ok":true,...,"bytes":945831,"ms":20415}`. Failure returns
the full provider chain's errors, untruncated — which job rows do not give you.

Each download also logs its cost:

```
[download] provider=yt-dlp kind=video window=30.0-33.0s 0.90MB in 20.3s
```

## Keeping it working

**yt-dlp goes stale fast.** YouTube changes its signature scheme and old builds
fail with the bot-check message even from a clean residential IP — a 2025.10
build failed on a home connection where 2026.08 succeeded. `worker/Dockerfile`
pins `YTDLP_VERSION`; bump it to force a rebuild, and check `/health` after
deploying. On macOS, note that Xcode's bundled Python 3.9 silently caps pip at
an old release, since yt-dlp now requires 3.10+.
