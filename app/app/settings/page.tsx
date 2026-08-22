"use client";

import { useEffect, useState } from "react";
import { Chip } from "@/components/ui/Chip";
import { Pill } from "@/components/ui/Pill";
import { signOut } from "@/app/auth/actions";
import { FORMATS, NICHES } from "@/lib/fixtures/niches";
import { useProfile } from "@/lib/store/profile";
import type { CaptionPreset, GameplayTrack, Niche, Platform } from "@/lib/agent/types";

const PLATFORMS: { id: Platform; label: string }[] = [
  { id: "youtube", label: "YouTube Shorts" },
  { id: "tiktok", label: "TikTok" },
  { id: "instagram", label: "Reels" },
];

export default function SettingsPage() {
  const { profile, setProfile, reset } = useProfile();
  const [connections, setConnections] = useState<{
    llm?: boolean;
    youtube?: boolean;
    worker?: boolean;
    liveFeed?: boolean;
    authEnabled?: boolean;
    ingest?: boolean;
    download?: boolean;
    workerApify?: boolean;
    workerFfmpeg?: boolean;
  } | null>(null);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then(setConnections)
      .catch(() => null);
  }, []);

  function togglePlatform(id: Platform) {
    const next = profile.platforms.includes(id)
      ? profile.platforms.filter((p) => p !== id)
      : [...profile.platforms, id];
    setProfile({ ...profile, platforms: next.length ? next : [id] });
  }

  return (
    <div className="max-w-[640px]">
      <p className="text-[13px] font-medium text-muted">Settings</p>
      <h1 className="display mt-2 text-[28px] text-ink">The desk</h1>
      <p className="mt-2 text-body">
        These preferences steer Home, Ideas, and the default Studio setup.
      </p>

      {connections ? (
        <section className="mt-10 rounded-[12px] bg-surface p-5 shadow-hairline">
          <p className="text-[13px] font-medium text-muted">Connections</p>
          <ul className="mt-3 space-y-2 text-[14px] text-body">
            <li>{connections.authEnabled ? "Supabase auth is on." : "Supabase keys missing."}</li>
            <li>
              {connections.llm
                ? "OpenAI brain is on (LLM_API_KEY or OPENAI_API_KEY)."
                : "Set LLM_API_KEY or OPENAI_API_KEY."}
            </li>
            <li>
              {connections.youtube
                ? "YouTube Data API is on."
                : "Set YOUTUBE_API_KEY for a live Ideas feed."}
            </li>
            <li>
              {connections.ingest
                ? "Supadata is on (cloud transcripts)."
                : "Set SUPADATA_API_KEY for cloud transcripts (no home PC)."}
            </li>
            <li>
              {connections.download
                ? "Apify token is set on Vercel."
                : "Set APIFY_TOKEN on Vercel (and Render) so export does not hit YouTube."}
            </li>
            <li>
              {connections.workerApify
                ? "Render worker has Apify (cloud download)."
                : connections.worker
                  ? "Render worker is up, but APIFY_TOKEN is missing on that service."
                  : "Set CLIP_WORKER_URL + CLIP_WORKER_SECRET for ffmpeg export."}
            </li>
            <li>
              {connections.worker
                ? connections.workerFfmpeg
                  ? "ffmpeg is present on the worker."
                  : "Render worker URL is set."
                : "Set CLIP_WORKER_URL + CLIP_WORKER_SECRET for ffmpeg export."}
            </li>
            <li>
              {connections.liveFeed
                ? "Home can stock a live niche feed."
                : "Live feed needs YouTube + service role."}
            </li>
          </ul>
        </section>
      ) : null}

      <section className="mt-10">
        <p className="text-[13px] font-medium text-muted">Name</p>
        <input
          value={profile.displayName}
          onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
          className="mt-3 w-full rounded-[10px] bg-surface px-4 py-2.5 text-[15px] shadow-hairline outline-none"
        />
      </section>

      <section className="mt-8">
        <p className="text-[13px] font-medium text-muted">Niche</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {NICHES.map((n) => (
            <Chip
              key={n.id}
              selected={profile.niche === n.id}
              onClick={() => setProfile({ ...profile, niche: n.id as Niche })}
            >
              {n.label}
            </Chip>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <p className="text-[13px] font-medium text-muted">Platforms</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {PLATFORMS.map((p) => (
            <Chip
              key={p.id}
              selected={profile.platforms.includes(p.id)}
              onClick={() => togglePlatform(p.id)}
            >
              {p.label}
            </Chip>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <p className="text-[13px] font-medium text-muted">Formats</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {FORMATS.map((f) => (
            <Chip
              key={f.id}
              selected={profile.interests.includes(f.id)}
              onClick={() => {
                const interests = profile.interests.includes(f.id)
                  ? profile.interests.filter((i) => i !== f.id)
                  : [...profile.interests, f.id];
                setProfile({ ...profile, interests });
              }}
            >
              {f.label}
            </Chip>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <p className="text-[13px] font-medium text-muted">Default captions</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(["hormozi", "clean", "karaoke"] as CaptionPreset[]).map((p) => (
            <Chip
              key={p}
              selected={profile.captionPreset === p}
              onClick={() => setProfile({ ...profile, captionPreset: p })}
            >
              {p}
            </Chip>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <p className="text-[13px] font-medium text-muted">Default gameplay</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(["minecraft", "gta", "subway", "none"] as GameplayTrack[]).map((g) => (
            <Chip
              key={g}
              selected={profile.defaultGameplay === g}
              onClick={() => setProfile({ ...profile, defaultGameplay: g })}
            >
              {g}
            </Chip>
          ))}
        </div>
      </section>

      <div className="mt-14 flex flex-wrap gap-3">
        <Pill variant="ghost" onClick={reset}>
          Reset to demo profile
        </Pill>
        <Pill variant="outline" onClick={() => void signOut()}>
          Sign out
        </Pill>
      </div>
    </div>
  );
}
