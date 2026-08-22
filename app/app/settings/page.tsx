"use client";

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
