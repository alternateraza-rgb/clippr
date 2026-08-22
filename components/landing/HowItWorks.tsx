import { Reveal } from "@/components/motion/Reveal";

const STEPS = [
  {
    n: "01",
    title: "Paste a video",
    body: "Drop in a link to any podcast, stream, or interview. That's the only input you need.",
  },
  {
    n: "02",
    title: "AI finds the viral moments",
    body: "It scans the whole video and picks out the moments most likely to blow up — no watching required.",
  },
  {
    n: "03",
    title: "AI edits it for you",
    body: "Captions, subtitles, formatting — all done automatically. Zero editing skills required.",
  },
  {
    n: "04",
    title: "You post and get paid",
    body: "Upload to TikTok, Reels, or Shorts. The format platforms already pay creators to post.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="bg-surface-warm py-28">
      <div className="mx-auto max-w-[1200px] px-6">
        <Reveal>
          <p className="eyebrow">What is AI clipping?</p>
          <h2 className="display mt-4 max-w-[18ch] text-[clamp(32px,5vw,48px)]">
            Four steps between you and a <em className="serif-em">payday</em>.
          </h2>
        </Reveal>
        <div className="mt-16 grid gap-6 md:grid-cols-2">
          {STEPS.map((step, i) => (
            <Reveal key={step.n} delay={i * 0.06}>
              <article className="rounded-[20px] bg-surface p-8 shadow-hairline">
                <p className="eyebrow text-brand">{step.n}</p>
                <h3 className="mt-4 font-display text-[24px] font-light tracking-tight">
                  {step.title}
                </h3>
                <p className="mt-3 max-w-[36ch] text-body">{step.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
