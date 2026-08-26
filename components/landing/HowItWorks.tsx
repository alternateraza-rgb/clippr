import { Band, SectionHead } from "@/components/landing/Section";
import { Reveal } from "@/components/motion/Reveal";

const STEPS = [
  {
    n: "01",
    title: "Paste a video",
    body: "Drop in a link to any podcast, stream, or interview. That's the only input you need.",
  },
  {
    n: "02",
    title: "AI finds the viral moment",
    body: "It reads the whole transcript and picks the minute most likely to travel — no watching required.",
  },
  {
    n: "03",
    title: "AI edits it for you",
    body: "Cuts, framing, and word-by-word captions, all burned in. Zero editing skills required.",
  },
  {
    n: "04",
    title: "You post and get paid",
    body: "Upload to TikTok, Reels, or Shorts — the format platforms already pay creators to post.",
  },
];

export function HowItWorks() {
  return (
    <Band id="how" tone="warm">
      <SectionHead
        eyebrow="What is AI clipping?"
        title={
          <>
            Four steps between you and a <span className="text-brand">payday</span>.
          </>
        }
      />
      <Reveal className="mt-14 grid gap-px overflow-hidden rounded-[var(--radius-panel)] bg-hairline md:grid-cols-2">
        {STEPS.map((step) => (
          <article key={step.n} className="h-full bg-surface p-8 md:p-10">
            <span className="tnum inline-flex h-8 items-center rounded-full bg-brand-soft px-3 text-[12.5px] font-semibold text-brand">
              {step.n}
            </span>
            <h3 className="display mt-5 text-[23px] text-ink">{step.title}</h3>
            <p className="mt-3 max-w-[38ch] text-[15px] leading-relaxed text-body">
              {step.body}
            </p>
          </article>
        ))}
      </Reveal>
    </Band>
  );
}
