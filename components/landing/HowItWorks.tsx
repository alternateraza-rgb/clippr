import { Band, SectionHead } from "@/components/landing/Section";
import { Reveal } from "@/components/motion/Reveal";
import { cn } from "@/lib/cn";

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

/**
 * A rail, not a 2×2 of boxes.
 *
 * Four identical cells in a hairline grid said "four things" but not "in this
 * order" — and four equal rectangles is the shape every generated landing page
 * reaches for. A line running through numbered nodes is the actual claim: one
 * thing happens, then the next, and you only touch the first and the last,
 * which is why only those two nodes carry the accent.
 *
 * The connector is drawn per step and reaches exactly into the gap before the
 * next one, so it stops at the last node instead of running off the edge.
 */
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

      <Reveal className="mt-16">
        <ol className="grid gap-10 md:grid-cols-4 md:gap-6">
          {STEPS.map((step, i) => {
            const endpoint = i === 0 || i === STEPS.length - 1;
            return (
              <li key={step.n} className="relative pl-11 md:pl-0">
                {i < STEPS.length - 1 ? (
                  <span
                    aria-hidden
                    className={cn(
                      "absolute w-px bg-hairline-strong",
                      // Mobile: down through the 40px stack gap.
                      "left-[13px] top-[31px] -bottom-10",
                      // Desktop: across the 24px column gap.
                      "md:left-[31px] md:top-[13px] md:-right-6 md:bottom-auto md:h-px md:w-auto",
                    )}
                  />
                ) : null}

                <span
                  className={cn(
                    "tnum absolute left-0 top-0 z-10 flex h-[27px] w-[27px] items-center",
                    "justify-center rounded-full text-micro font-semibold",
                    "md:relative md:mb-6",
                    endpoint ? "bg-brand text-on-brand" : "bg-surface text-ink shadow-hairline",
                  )}
                >
                  {step.n}
                </span>

                <h3 className="display text-d1 text-ink">{step.title}</h3>
                <p className="mt-2.5 max-w-[34ch] text-base text-body">{step.body}</p>
              </li>
            );
          })}
        </ol>
      </Reveal>
    </Band>
  );
}
