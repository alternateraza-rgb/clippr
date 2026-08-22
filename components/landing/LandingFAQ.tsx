import { Reveal } from "@/components/motion/Reveal";

const FAQS = [
  {
    q: "Do I need experience?",
    a: "No. The AI handles the editing, captions, and formatting. If you can paste a link, you can start.",
  },
  {
    q: "Do I need to show my face?",
    a: "Not at all. Most people clip other creators' podcasts, streams, and interviews — no camera required.",
  },
  {
    q: "How fast can I start?",
    a: "Paste your first video and you'll have a ready-to-post clip in minutes.",
  },
  {
    q: "How do I actually get paid?",
    a: "Platform payouts, getting paid to clip for other creators, or growing your own page for brand deals — most people combine more than one.",
  },
];

export function LandingFAQ() {
  return (
    <section id="faq" className="bg-surface-warm py-28">
      <div className="mx-auto max-w-[1200px] px-6">
        <Reveal>
          <p className="eyebrow">Questions</p>
          <h2 className="display mt-4 max-w-[16ch] text-[clamp(32px,5vw,48px)]">
            Before you <em className="serif-em">start</em>.
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {FAQS.map((faq, i) => (
            <Reveal key={faq.q} delay={i * 0.06}>
              <article className="rounded-[20px] bg-surface p-8 shadow-hairline">
                <h3 className="font-display text-[20px] font-light tracking-tight">
                  {faq.q}
                </h3>
                <p className="mt-3 text-body">{faq.a}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
