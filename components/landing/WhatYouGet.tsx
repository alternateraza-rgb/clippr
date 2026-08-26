import { AudioLines, Captions, Crop, Scissors } from "lucide-react";
import { ClipFrame } from "@/components/landing/ClipFrame";
import { Band, SectionHead } from "@/components/landing/Section";
import { Reveal } from "@/components/motion/Reveal";
import { SHOWCASE } from "@/lib/fixtures/showcase";

const PASSES = [
  {
    icon: AudioLines,
    title: "It listens to all of it",
    body: "Every word, timed to the audio — not guessed from the auto-captions YouTube hands out.",
  },
  {
    icon: Scissors,
    title: "It cuts a story, not a window",
    body: "Setup, beat, turn, payoff. The clip is assembled from the moments that carry it, wherever they sit on the tape.",
  },
  {
    icon: Crop,
    title: "It frames on the speaker",
    body: "Vertical 9:16, punched in on whoever is talking, so nothing important sits off-screen.",
  },
  {
    icon: Captions,
    title: "It captions word by word",
    body: "Burned in on the beat, in the style that actually holds people — no separate editor, no export dance.",
  },
];

export function WhatYouGet() {
  return (
    <Band id="what">
      <div className="grid items-center gap-14 md:grid-cols-[1fr_minmax(0,300px)] md:gap-20">
        <div>
          <SectionHead
            eyebrow="What comes back"
            title={
              <>
                Four passes over the tape, then a{" "}
                <span className="text-brand">finished clip</span>.
              </>
            }
            lede="This is the whole edit, not just subtitles bolted onto a random minute."
          />
          <Reveal className="mt-12 grid gap-8 sm:grid-cols-2">
            {PASSES.map((pass) => {
              const Icon = pass.icon;
              return (
                <div key={pass.title}>
                  <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-brand-soft">
                    <Icon className="h-[18px] w-[18px] text-brand" strokeWidth={2} />
                  </span>
                  <h3 className="mt-4 text-[16.5px] font-semibold text-ink">{pass.title}</h3>
                  <p className="mt-2 max-w-[34ch] text-[14.5px] leading-relaxed text-body">
                    {pass.body}
                  </p>
                </div>
              );
            })}
          </Reveal>
        </div>

        <Reveal className="mx-auto w-full max-w-[280px]">
          <ClipFrame clip={SHOWCASE[2]} />
          <p className="mt-4 text-center text-[12.5px] text-muted">
            A real clip, cut by Clipmuse.
          </p>
        </Reveal>
      </div>
    </Band>
  );
}
