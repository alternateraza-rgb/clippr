"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AgentTimeline } from "@/components/clip/AgentTimeline";
import { ClipPreview } from "@/components/clip/ClipPreview";
import { ScoreBreakdown } from "@/components/clip/ScoreBreakdown";
import { Chip } from "@/components/ui/Chip";
import { Field } from "@/components/ui/Field";
import { Pill } from "@/components/ui/Pill";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { useJobs } from "@/lib/store/jobs";
import { parseYouTubeId } from "@/lib/youtube";
import { formatTimestamp } from "@/lib/format";
import { useProfile } from "@/lib/store/profile";
import type {
  AgentEvent,
  AnalysisResult,
  CaptionPreset,
  ClipCandidate,
  GameplayTrack,
} from "@/lib/agent/types";

type Phase = "idle" | "running" | "results";

function StudioInner() {
  const params = useSearchParams();
  const { profile } = useProfile();
  const { addJob } = useJobs();
  const initialId =
    params.get("v") ?? parseYouTubeId(params.get("url") ?? "") ?? "";
  const abort = useRef<AbortController | null>(null);

  const [raw, setRaw] = useState(
    initialId ? `https://www.youtube.com/watch?v=${initialId}` : "",
  );
  const [error, setError] = useState("");
  const [phase, setPhase] = useState<Phase>(initialId ? "running" : "idle");
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [selected, setSelected] = useState<ClipCandidate | null>(null);
  const [gameplay, setGameplay] = useState<GameplayTrack>(profile.defaultGameplay);
  const [preset, setPreset] = useState<CaptionPreset>(profile.captionPreset);
  const [saved, setSaved] = useState(false);
  const [exportMsg, setExportMsg] = useState("");
  const [exporting, setExporting] = useState(false);
  const [connections, setConnections] = useState<{
    worker: boolean;
    llm: boolean;
    ingest?: boolean;
    download?: boolean;
  } | null>(null);

  const videoId = parseYouTubeId(raw);

  function patchTranscribe(message: string) {
    setEvents((prev) => {
      const next = [...prev];
      const idx = [...next].map((e) => e.stage).lastIndexOf("transcribe");
      const event: AgentEvent = { stage: "transcribe", message, at: next[idx]?.at ?? Date.now() };
      if (idx >= 0) next[idx] = event;
      else next.push(event);
      return next;
    });
  }

  async function consumeAnalyze(id: string, controller: AbortController): Promise<"result" | "pending"> {
    const res = await fetch("/api/studio/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ videoId: id, niche: profile.niche }),
      signal: controller.signal,
    });
    if (!res.ok || !res.body) {
      const payload = await res.json().catch(() => ({}));
      throw new Error((payload as { message?: string }).message || "Could not analyze that video.");
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let pending = false;
    let gotResult = false;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split("\n\n");
      buffer = chunks.pop() ?? "";
      for (const chunk of chunks) {
        const line = chunk.split("\n").find((l) => l.startsWith("data: "));
        if (!line) continue;
        const packet = JSON.parse(line.slice(6)) as {
          type: string;
          stage?: AgentEvent["stage"];
          message?: string;
          at?: number;
          analysis?: AnalysisResult;
        };
        if (packet.type === "event" && packet.stage && packet.message) {
          setEvents((prev) => [
            ...prev,
            { stage: packet.stage!, message: packet.message!, at: packet.at ?? 0 },
          ]);
        }
        if (packet.type === "error") {
          throw new Error(packet.message || "Analysis failed");
        }
        if (packet.type === "pending") {
          pending = true;
          if (packet.message) patchTranscribe(packet.message);
        }
        if (packet.type === "result" && packet.analysis) {
          gotResult = true;
          setAnalysis(packet.analysis);
          setSelected(packet.analysis.candidates[0] ?? null);
          setPhase("results");
        }
      }
    }
    if (gotResult) return "result";
    if (pending) return "pending";
    throw new Error("Analysis ended without a result.");
  }

  async function waitForWorkerTranscript(id: string, controller: AbortController) {
    await fetch("/api/studio/transcript", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ videoId: id }),
      signal: controller.signal,
    }).catch(() => null);
    const deadline = Date.now() + 10 * 60_000;
    while (Date.now() < deadline) {
      if (controller.signal.aborted) throw new DOMException("Aborted", "AbortError");
      const res = await fetch(`/api/studio/transcript?videoId=${encodeURIComponent(id)}`, {
        signal: controller.signal,
      });
      const data = (await res.json()) as {
        ready?: boolean;
        status?: string;
        source?: string | null;
        words?: number;
        error?: string | null;
      };
      if (data.ready) {
        patchTranscribe(
          `${(data.words ?? 0).toLocaleString()} words ready · ${data.source ?? "worker"}`,
        );
        return;
      }
      if (data.status === "failed") {
        throw new Error(data.error || "Worker transcribe failed. Check Render logs.");
      }
      const label =
        data.status === "running"
          ? "Worker is downloading audio / running Whisper…"
          : data.status === "queued"
            ? "Queued on Render (instance may be waking)…"
            : "Waiting for a transcript…";
      patchTranscribe(label);
      await new Promise((r) => setTimeout(r, 3000));
    }
    throw new Error("Transcript timed out. Check CLIP_WORKER_URL and Render logs.");
  }

  async function start(id: string) {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setAnalysis(null);
    setSelected(null);
    setSaved(false);
    setExportMsg("");
    setEvents([]);
    setPhase("running");
    setError("");

    try {
      const first = await consumeAnalyze(id, controller);
      if (first === "pending") {
        await waitForWorkerTranscript(id, controller);
        await consumeAnalyze(id, controller);
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setPhase("idle");
      setError(err instanceof Error ? err.message : "Analysis failed");
    }
  }

  function submit() {
    if (!videoId) {
      setError("That doesn’t look like a YouTube link.");
      return;
    }
    start(videoId);
  }

  useEffect(() => {
    if (!initialId) return;
    queueMicrotask(() => {
      void start(initialId);
    });
    return () => abort.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialId]);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((d: { worker?: boolean; llm?: boolean; ingest?: boolean; download?: boolean }) => {
        setConnections({
          worker: Boolean(d.worker),
          llm: Boolean(d.llm),
          ingest: Boolean(d.ingest),
          download: Boolean(d.download),
        });
      })
      .catch(() => null);
  }, []);

  const noCaptions = Boolean(analysis && selected && selected.captionLines.length === 0);

  const duration = useMemo(() => {
    if (!selected) return 12;
    return Math.max(4, selected.end - selected.start);
  }, [selected]);

  async function saveClip() {
    if (!analysis || !selected) return;
    const job = {
      id: crypto.randomUUID(),
      video: analysis.video,
      candidate: selected,
      composition: {
        videoId: analysis.video.videoId,
        start: selected.start,
        end: selected.end,
        gameplay,
        captionPreset: preset,
        captionLines: selected.captionLines,
      },
      status: "saved" as const,
      createdAt: new Date().toISOString(),
    };
    addJob(job);
    await fetch("/api/studio/save", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(job),
    }).catch(() => null);
    setSaved(true);
  }

  async function pollRender(renderId: string) {
    const deadline = Date.now() + 8 * 60_000;
    while (Date.now() < deadline) {
      const res = await fetch(`/api/studio/renders/${renderId}`);
      const data = (await res.json()) as {
        render?: {
          status: string;
          progress: number;
          error?: string | null;
          downloadUrl?: string | null;
        };
      };
      const render = data.render;
      if (!render) break;
      if (render.status === "ready" && render.downloadUrl) {
        const file = await fetch(render.downloadUrl);
        const blob = await file.blob();
        const href = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = href;
        a.download = `clipmuse-${analysis?.video.videoId ?? "clip"}.mp4`;
        a.click();
        URL.revokeObjectURL(href);
        setExportMsg("Downloaded.");
        return;
      }
      if (render.status === "failed") {
        setExportMsg(render.error || "Render failed.");
        return;
      }
      setExportMsg(`${render.status}${render.progress ? ` · ${render.progress}%` : ""}`);
      await new Promise((r) => setTimeout(r, 3000));
    }
    setExportMsg("Still rendering. Check Library in a minute.");
  }

  async function exportClip() {
    if (!analysis || !selected || exporting) return;
    setExporting(true);
    setExportMsg("Queuing the render…");
    try {
      const res = await fetch("/api/studio/export", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          videoId: analysis.video.videoId,
          start: selected.start,
          end: selected.end,
          captionLines: selected.captionLines,
          gameplay,
          captionPreset: preset,
          candidate: selected,
        }),
      });
      const type = res.headers.get("content-type") ?? "";
      if (type.includes("video/") || type.includes("octet-stream")) {
        const blob = await res.blob();
        const href = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = href;
        a.download = `clipmuse-${analysis.video.videoId}.mp4`;
        a.click();
        URL.revokeObjectURL(href);
        setExportMsg("Downloaded.");
        return;
      }
      const payload = (await res.json().catch(() => ({}))) as {
        message?: string;
        renderId?: string;
        status?: string;
      };
      if (payload.renderId) {
        await pollRender(payload.renderId);
        return;
      }
      setExportMsg(payload.message ?? "Export is preview-only on this machine.");
    } catch (err) {
      setExportMsg(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
      <div>
        <p className="text-[13px] font-medium text-muted">Studio</p>
        <h1 className="display mt-2 text-[28px] text-ink">Cut the moment</h1>

        <div className="mt-6 max-w-[640px]">
          <Field
            value={raw}
            onChange={(v) => {
              setRaw(v);
              setError("");
            }}
            onSubmit={submit}
            placeholder="Paste a long YouTube link (8+ min)"
          />
          {error ? <p className="mt-3 text-[13px] text-brand">{error}</p> : null}
          {noCaptions && phase !== "idle" ? (
            <p className="mt-3 text-[13px] text-warn">
              Captions are disabled on this video. Karaoke will be empty.
            </p>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {(["minecraft", "gta", "subway", "none"] as GameplayTrack[]).map((g) => (
            <Chip key={g} selected={gameplay === g} onClick={() => setGameplay(g)}>
              {g === "none" ? "No gameplay" : g === "gta" ? "GTA V" : g === "subway" ? "Subway" : "Minecraft"}
            </Chip>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {(["hormozi", "clean", "karaoke"] as CaptionPreset[]).map((p) => (
            <Chip key={p} selected={preset === p} onClick={() => setPreset(p)}>
              {p === "hormozi" ? "Hormozi" : p === "clean" ? "Clean" : "Karaoke"}
            </Chip>
          ))}
        </div>

        {phase === "idle" ? (
          <p className="mt-16 max-w-[40ch] text-body">
            Paste a longform YouTube link (8+ minutes). Transcripts come from
            Supadata in the cloud; export downloads via Apify, then Render burns captions.
          </p>
        ) : null}
        {phase === "idle" && connections && !connections.ingest ? (
          <p className="mt-4 max-w-[46ch] text-[13px] text-warn">
            SUPADATA_API_KEY is not set. Studio cannot pull cloud transcripts when YouTube blocks Vercel.
          </p>
        ) : null}
        {phase === "idle" && connections && !connections.llm ? (
          <p className="mt-3 max-w-[46ch] text-[13px] text-warn">
            No LLM key. Set LLM_API_KEY or OPENAI_API_KEY so scoring is not a heuristic guess.
          </p>
        ) : null}

        {phase === "running" ? (
          <div className="mt-10 max-w-[520px] rounded-[12px] bg-surface p-6 shadow-hairline">
            <AgentTimeline events={events} cursor={Number.POSITIVE_INFINITY} />
          </div>
        ) : null}

        {phase === "results" && analysis ? (
          <div className="mt-10 space-y-3">
            {analysis.candidates.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setSelected(c);
                  setSaved(false);
                }}
                className={`w-full rounded-[12px] bg-surface p-5 text-left shadow-hairline transition-all ${
                  selected?.id === c.id ? "ring-1 ring-brand" : "hover:shadow-lift"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[12px] tabular-nums text-muted">
                      {formatTimestamp(c.start)} – {formatTimestamp(c.end)}
                    </p>
                    <h3 className="mt-2 font-display text-[17px] font-medium leading-snug">
                      {c.hook}
                    </h3>
                    <p className="mt-2 text-[14px] text-body">{c.whyItClips}</p>
                  </div>
                  <ScoreRing score={c.score} />
                </div>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        {selected && videoId ? (
          <div>
            <ClipPreview
              videoId={videoId}
              start={selected.start}
              duration={duration}
              captionLines={selected.captionLines}
              preset={preset}
              gameplay={gameplay}
            />
            <div className="mt-5 rounded-[12px] bg-surface p-5 shadow-hairline">
              <ScoreBreakdown scores={selected.scores} />
              <div className="mt-5 flex flex-col gap-2">
                <Pill onClick={saveClip} className="w-full">
                  {saved ? "Saved to library" : "Save clip"}
                </Pill>
                <Pill variant="ghost" className="w-full" onClick={exportClip} disabled={exporting}>
                  {exporting ? "Rendering…" : "Export"}
                </Pill>
              </div>
              <p className="mt-3 text-[12px] text-muted">
                {exportMsg || "Export burns captions into a 9:16 mp4 on the worker."}
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-[12px] bg-surface-warm p-6 text-[14px] text-body">
            A 9:16 preview sits here once a cut is ready.
          </div>
        )}
      </aside>
    </div>
  );
}

export default function StudioPage() {
  return (
    <Suspense fallback={<p className="text-muted">Opening studio…</p>}>
      <StudioInner />
    </Suspense>
  );
}
