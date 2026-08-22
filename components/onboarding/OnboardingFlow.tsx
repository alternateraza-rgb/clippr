"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Chip } from "@/components/ui/Chip";
import { Pill } from "@/components/ui/Pill";
import { Wordmark } from "@/components/ui/Wordmark";
import { useProfile } from "@/lib/store/profile";
import { FORMATS, NICHES, pickForMe } from "@/lib/fixtures/niches";
import type { Niche, Platform } from "@/lib/agent/types";
import { cn } from "@/lib/cn";

const PLATFORMS: { id: Platform; label: string }[] = [
  { id: "youtube", label: "YouTube Shorts" },
  { id: "tiktok", label: "TikTok" },
  { id: "instagram", label: "Reels" },
];

export function OnboardingFlow() {
  const router = useRouter();
  const { profile, setProfile } = useProfile();
  const [step, setStep] = useState(0);
  const [platforms, setPlatforms] = useState<Platform[]>(profile.platforms);
  const [niche, setNiche] = useState<Niche>(profile.niche);
  const [interests, setInterests] = useState<string[]>(profile.interests);
  const [source, setSource] = useState<"manual" | "picked">(profile.nicheSource);
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<ReturnType<typeof pickForMe> | null>(null);
  const [finishing, setFinishing] = useState(false);

  function toggle<T>(list: T[], value: T) {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }

  async function runPick() {
    setPicking(true);
    setPicked(null);
    await new Promise((r) => setTimeout(r, 1400));
    const result = pickForMe();
    setPicked(result);
    setNiche(result.primary.id);
    setSource("picked");
    setPicking(false);
  }

  async function finish() {
    setFinishing(true);
    const next = {
      ...profile,
      platforms: platforms.length ? platforms : (["youtube"] as Platform[]),
      niche,
      interests: interests.length ? interests : ["storytelling"],
      nicheSource: source,
      onboardingComplete: true,
    };
    await setProfile(next);
    await fetch("/api/discovery/bootstrap", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        niche: next.niche,
        interests: next.interests,
        platforms: next.platforms,
      }),
    }).catch(() => null);
    router.push("/app");
    router.refresh();
  }

  const progress = ((step + 1) / 4) * 100;

  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto flex min-h-screen max-w-[720px] flex-col px-6 py-8">
        <div className="flex items-center justify-between">
          <Wordmark />
          <p className="text-[13px] text-muted">{step + 1} / 4</p>
        </div>
        <div className="mt-6 h-px bg-surface-warm-alt">
          <div
            className="h-px bg-brand transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex flex-1 flex-col justify-center py-16">
          <AnimatePresence mode="wait">
            {step === 0 ? (
              <Step key="p" title="Where will you post?">
                <p className="mt-4 max-w-[36ch] text-body">
                  You can change this later. Most clippers start with two.
                </p>
                <div className="mt-10 flex flex-wrap gap-2">
                  {PLATFORMS.map((p) => (
                    <Chip
                      key={p.id}
                      selected={platforms.includes(p.id)}
                      onClick={() => setPlatforms(toggle(platforms, p.id))}
                    >
                      {p.label}
                    </Chip>
                  ))}
                  <Chip
                    selected={platforms.length === 3}
                    onClick={() => setPlatforms(["youtube", "tiktok", "instagram"])}
                  >
                    All three
                  </Chip>
                </div>
              </Step>
            ) : null}

            {step === 1 ? (
              <Step key="n" title="What is the channel about?">
                <p className="mt-4 max-w-[40ch] text-body">
                  One niche. The feed, the ideas, and the agent all tune to it.
                </p>
                <div className="mt-10 flex flex-wrap gap-2">
                  {NICHES.map((n) => (
                    <Chip
                      key={n.id}
                      selected={niche === n.id && source === "manual"}
                      onClick={() => {
                        setNiche(n.id);
                        setSource("manual");
                      }}
                    >
                      {n.label}
                    </Chip>
                  ))}
                </div>
                <div className="mt-8">
                  <Pill variant="ghost" onClick={runPick} disabled={picking}>
                    {picking ? "Reading the market…" : "Pick for me"}
                  </Pill>
                </div>
                {picking ? (
                  <p className="mt-6 text-[14px] text-muted">
                    Scoring supply, competition, and what still pays…
                  </p>
                ) : null}
                {picked && !picking ? (
                  <div className="mt-8 rounded-[20px] bg-surface p-6 shadow-hairline">
                    <p className="eyebrow text-brand">Recommended</p>
                    <h3 className="mt-3 font-display text-[28px] font-light">
                      {picked.primary.label}
                    </h3>
                    <p className="mt-2 text-body">{picked.primary.blurb}</p>
                    <p className="mt-4 text-[13px] text-muted">
                      Runner-up: {picked.runnerUp.label}. You can still tap any chip above.
                    </p>
                  </div>
                ) : null}
              </Step>
            ) : null}

            {step === 2 ? (
              <Step key="f" title="How do you like to cut?">
                <p className="mt-4 max-w-[38ch] text-body">
                  Formats help the agent prefer story beats, arguments, or highlights.
                </p>
                <div className="mt-10 flex flex-wrap gap-2">
                  {FORMATS.map((f) => (
                    <Chip
                      key={f.id}
                      selected={interests.includes(f.id)}
                      onClick={() => setInterests(toggle(interests, f.id))}
                    >
                      {f.label}
                    </Chip>
                  ))}
                </div>
              </Step>
            ) : null}

            {step === 3 ? (
              <Step key="c" title="This is your desk.">
                <p className="mt-4 max-w-[40ch] text-body">
                  We&apos;ll stock Home and Ideas for this setup. You can retune anytime.
                </p>
                <div className="mt-10 rounded-[20px] bg-surface p-8 shadow-hairline">
                  <p className="eyebrow text-brand">
                    {source === "picked" ? "Picked for you" : "Your pick"}
                  </p>
                  <h3 className="mt-3 font-display text-[32px] font-light">
                    {NICHES.find((n) => n.id === niche)?.label}
                  </h3>
                  <p className="mt-3 text-body">
                    {platforms.map((p) => PLATFORMS.find((x) => x.id === p)?.label).join(" · ")}
                  </p>
                  <p className="mt-2 text-[14px] text-muted">
                    {interests
                      .map((id) => FORMATS.find((f) => f.id === id)?.label)
                      .filter(Boolean)
                      .join(", ") || "No format preference"}
                  </p>
                </div>
              </Step>
            ) : null}
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between pb-6">
          <Pill
            variant="text"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className={cn(step === 0 && "invisible")}
          >
            Back
          </Pill>
          {step < 3 ? (
            <Pill onClick={() => setStep((s) => s + 1)}>Continue</Pill>
          ) : (
            <Pill onClick={finish} disabled={finishing}>
              {finishing ? "Stocking your desk…" : "Open the studio"}
            </Pill>
          )}
        </div>
      </div>
    </div>
  );
}

function Step({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <h1 className="display text-[clamp(32px,6vw,48px)]">{title}</h1>
      {children}
    </motion.div>
  );
}
