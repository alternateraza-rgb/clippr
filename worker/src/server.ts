import { createServer } from "node:http";
import "../../lib/load-env";
import { mkdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { env, hasApify, hasLlm, hasServiceRole, hasSupadata, workerSecret, ytdlpProxy } from "../../lib/config";
import { upsertTranscribeJob } from "../../lib/supabase/jobs";
import { drainQueued, processRender } from "./render";
import { processTranscribe } from "./transcribe";
import { run } from "./exec";
import { downloadSource } from "./media";

const PORT = Number(env("PORT") || 8787);
const HOST = "0.0.0.0";

let pumping = false;
const queue: string[] = [];
const seen = new Set<string>();

let transcribing = false;
const transcribeQueue: string[] = [];
const transcribeSeen = new Set<string>();

function enqueueTranscribe(id: string) {
  if (!id) return;
  if (transcribeQueue.includes(id) || transcribeSeen.has(id)) return;
  transcribeQueue.push(id);
  void upsertTranscribeJob({ videoId: id, status: "queued" });
  void pumpTranscribe();
}

async function pumpTranscribe() {
  if (transcribing) return;
  transcribing = true;
  while (transcribeQueue.length) {
    const id = transcribeQueue.shift();
    if (!id) continue;
    transcribeSeen.add(id);
    try {
      await processTranscribe(id);
    } catch (error) {
      console.error("[worker] transcribe failed", id, error);
    } finally {
      transcribeSeen.delete(id);
    }
  }
  transcribing = false;
}

function enqueue(id: string) {
  if (!id) return;
  if (queue.includes(id) || seen.has(id)) return;
  queue.push(id);
  void pump();
}

async function pump() {
  if (pumping) return;
  pumping = true;
  while (queue.length) {
    const id = queue.shift();
    if (!id) continue;
    seen.add(id);
    try {
      await processRender(id);
    } catch (error) {
      console.error("[worker] render failed", id, error);
    } finally {
      seen.delete(id);
    }
  }
  pumping = false;
}

/**
 * Proves the download chain end to end without rendering a clip: which provider
 * answered, how big, how long. Three seconds of a Creative Commons video, so a
 * check costs a rounding error of proxy bandwidth.
 */
async function selftest(body: Record<string, unknown>) {
  const videoId = String(body.videoId || "aqz-KE-bpKQ");
  const start = Number(body.start) || 30;
  const dir = join(tmpdir(), "clipmuse-selftest");
  const dest = join(dir, `${videoId}.mp4`);
  const startedAt = Date.now();
  await mkdir(dir, { recursive: true });
  try {
    const source = await downloadSource(videoId, dest, "video", { start, end: start + 3 });
    const { size } = await stat(dest);
    return {
      ok: true,
      videoId,
      proxy: Boolean(ytdlpProxy()),
      offset: source.offset,
      bytes: size,
      ms: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      ok: false,
      videoId,
      proxy: Boolean(ytdlpProxy()),
      ms: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "selftest failed",
    };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => null);
  }
}

function authorize(req: { headers: { authorization?: string } }) {
  const secret = workerSecret();
  if (!secret) return false;
  return req.headers.authorization === `Bearer ${secret}`;
}

function readJson(req: import("node:http").IncomingMessage) {
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(Buffer.from(c)));
    req.on("end", () => {
      if (!chunks.length) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>);
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (req.method === "GET" && url.pathname === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(
      JSON.stringify({
        ok: true,
        queue: queue.length,
        busy: pumping,
        transcribe: transcribeQueue.length,
        apify: hasApify(),
        llm: hasLlm(),
        proxy: Boolean(ytdlpProxy()),
        ffmpeg: ffmpegReady,
        ytdlp: ytdlpVersion || false,
      }),
    );
    return;
  }

  if (req.method === "POST" && (url.pathname === "/render" || url.pathname === "/drain" || url.pathname === "/transcribe" || url.pathname === "/selftest")) {
    if (!authorize(req)) {
      res.writeHead(401, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: false, reason: "unauthorized" }));
      return;
    }
    try {
      if (url.pathname === "/transcribe") {
        const body = await readJson(req);
        const videoId = String(body.videoId || body.id || "");
        if (!videoId) {
          res.writeHead(400, { "content-type": "application/json" });
          res.end(JSON.stringify({ ok: false, reason: "missing_videoId" }));
          return;
        }
        enqueueTranscribe(videoId);
        res.writeHead(202, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: true, videoId }));
        return;
      }
      if (url.pathname === "/drain") {
        const ids = await drainQueued();
        ids.forEach(enqueue);
        res.writeHead(202, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: true, queued: ids.length }));
        return;
      }
      const body = await readJson(req);
      const renderId = String(body.renderId || body.id || "");
      if (!renderId) {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: false, reason: "missing_renderId" }));
        return;
      }
      enqueue(renderId);
      res.writeHead(202, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, renderId }));
    } catch (error) {
      res.writeHead(500, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          ok: false,
          reason: error instanceof Error ? error.message : "bad_request",
        }),
      );
    }
    return;
  }

  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ ok: false }));
});

// Probed once at boot rather than looked for at a hardcoded path — ffmpeg lives
// in /usr/bin on the Render image but under Homebrew or ~/.local on a laptop.
let ffmpegReady = false;
let ytdlpVersion = "";

server.listen(PORT, HOST, () => {
  const secret = Boolean(workerSecret());
  console.info(`[worker] listening on ${HOST}:${PORT}`);
  console.info(
    `[worker] secret=${secret ? "set" : "MISSING"} supabase=${hasServiceRole() ? "set" : "MISSING"} llm=${hasLlm() ? "set" : "MISSING"} supadata=${hasSupadata() ? "set" : "no"} apify=${hasApify() ? "set" : "no"}`,
  );
  run("ffmpeg", ["-version"])
    .then(() => {
      ffmpegReady = true;
    })
    .catch(() => console.info("[worker] ffmpeg=MISSING"));
  // yt-dlp goes stale fast — an old build fails with "Sign in to confirm you're
  // not a bot", which reads like an IP block. Log the version so the answer is
  // in the deploy log instead of needing a repro.
  run("yt-dlp", ["--version"])
    .then(({ stdout }) => {
      ytdlpVersion = stdout.trim();
      console.info(`[worker] yt-dlp=${ytdlpVersion}`);
    })
    .catch(() => console.info("[worker] yt-dlp=MISSING"));
  drainQueued()
    .then((ids) => ids.forEach(enqueue))
    .catch((error) => console.error("[worker] drain failed", error));
});

// Render SIGTERMs the old instance on every deploy and on free-tier spin-down.
// Exiting cleanly keeps that out of the logs as an npm error.
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    console.info(`[worker] ${signal} — shutting down`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  });
}

setInterval(() => {
  drainQueued()
    .then((ids) => ids.forEach(enqueue))
    .catch(() => null);
}, 45_000);
