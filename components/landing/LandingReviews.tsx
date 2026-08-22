import { Reveal } from "@/components/motion/Reveal";

const REVIEWS = [
  {
    name: "Jordan M.",
    initials: "JM",
    quote:
      "Made $8,200 last month clipping in my spare time. No camera, no editing skills, just followed the steps.",
  },
  {
    name: "Aaliyah R.",
    initials: "AR",
    quote:
      "My first AI-cut clip hit 400K views. Two months later I crossed $10K.",
  },
  {
    name: "Marcus T.",
    initials: "MT",
    quote:
      "I don't even film my own content — I clip other people's podcasts and get paid to post.",
  },
];

function Stars() {
  return (
    <div className="flex gap-0.5 text-brand" aria-label="5 out of 5 stars">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i}>★</span>
      ))}
    </div>
  );
}

export function LandingReviews() {
  return (
    <section id="reviews" className="py-28">
      <div className="mx-auto max-w-[1200px] px-6">
        <Reveal>
          <p className="eyebrow">Real people, placeholder reviews</p>
          <h2 className="display mt-4 max-w-[18ch] text-[clamp(32px,5vw,48px)]">
            People are already getting <em className="serif-em">paid</em>.
          </h2>
        </Reveal>
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {REVIEWS.map((review, i) => (
            <Reveal key={review.name} delay={i * 0.08}>
              <article className="flex h-full flex-col rounded-[20px] bg-surface-warm p-6 shadow-hairline">
                <Stars />
                <p className="mt-4 flex-1 text-[15px] leading-relaxed text-body">
                  &ldquo;{review.quote}&rdquo;
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft text-[12px] font-medium text-brand">
                    {review.initials}
                  </div>
                  <p className="text-[14px] text-ink">{review.name}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
        <Reveal className="mt-6">
          <p className="text-[12px] text-muted/70">
            *Illustrative reviews for preview purposes.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
