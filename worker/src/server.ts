import { createServer } from "node:http";
import "../../lib/load-env";
import { env, hasLlm, hasServiceRole, workerSecret } from "../../lib/config";
import { upsertTranscribeJob } from "../../lib/supabase/jobs";
import { drainQueued, processRender } from "./render";
import { processTranscribe } from "./transcribe";

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
    res.end(JSON.stringify({ ok: true, queue: queue.length, busy: pumping, transcribe: transcribeQueue.length }));
    return;
  }

  if (req.method === "POST" && (url.pathname === "/render" || url.pathname === "/drain" || url.pathname === "/transcribe")) {
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

server.listen(PORT, HOST, () => {
  const secret = Boolean(workerSecret());
  console.info(`[worker] listening on ${HOST}:${PORT}`);
  console.info(
    `[worker] secret=${secret ? "set" : "MISSING"} supabase=${hasServiceRole() ? "set" : "MISSING"} llm=${hasLlm() ? "set" : "MISSING"}`,
  );
  drainQueued()
    .then((ids) => ids.forEach(enqueue))
    .catch((error) => console.error("[worker] drain failed", error));
});

setInterval(() => {
  drainQueued()
    .then((ids) => ids.forEach(enqueue))
    .catch(() => null);
}, 45_000);
