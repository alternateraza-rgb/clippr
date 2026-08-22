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

  const videoId = parseYouTubeId(raw);

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
      const res = await fetch("/api/studio/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ videoId: id, niche: profile.niche }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.message || "Could not analyze that video.");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
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
          if (packet.type === "result" && packet.analysis) {
            setAnalysis(packet.analysis);
            setSelected(packet.analysis.candidates[0] ?? null);
            setPhase("results");
          }
        }
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

  const noCaptions = analysis && !analysis.video.captionsAvailable;

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

  async function exportClip() {
    if (!analysis || !selected) return;
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
    const payload = (await res.json().catch(() => ({}))) as { message?: string };
    setExportMsg(payload.message ?? "Export is preview-only on this machine.");
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
            placeholder="Paste a YouTube link"
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
            Paste a YouTube link. The agent reads the transcript, scores moments,
            and lays captions on a 9:16 preview.
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
                <Pill variant="ghost" className="w-full" onClick={exportClip}>
                  Export
                </Pill>
              </div>
              <p className="mt-3 text-[12px] text-muted">
                {exportMsg || "Export is off unless ENABLE_LOCAL_EXPORT=true."}
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
