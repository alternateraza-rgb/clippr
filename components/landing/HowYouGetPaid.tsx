import { Reveal } from "@/components/motion/Reveal";

const PATHS = [
  {
    n: "01",
    title: "Platform payouts",
    body: "TikTok, YouTube Shorts, and Instagram all pay creators directly based on views.",
  },
  {
    n: "02",
    title: "Get paid to clip for others",
    body: "Podcasters and creators pay people to clip their content — no audience of your own required to start.",
  },
  {
    n: "03",
    title: "Grow your own page",
    body: "Once you're posting consistently, brand deals and sponsorships stack on top.",
  },
];

export function HowYouGetPaid() {
  return (
    <section id="get-paid" className="py-28">
      <div className="mx-auto max-w-[1200px] px-6">
        <Reveal>
          <p className="eyebrow text-brand">The money</p>
          <h2 className="display mt-4 max-w-[18ch] text-[clamp(32px,5vw,48px)]">
            Three ways this makes you <em className="serif-em">money</em>.
          </h2>
        </Reveal>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {PATHS.map((path, i) => (
            <Reveal key={path.n} delay={i * 0.06}>
              <article className="h-full rounded-[20px] bg-surface-warm p-8 shadow-hairline">
                <p className="eyebrow text-brand">{path.n}</p>
                <h3 className="mt-4 font-display text-[22px] font-light tracking-tight">
                  {path.title}
                </h3>
                <p className="mt-3 text-body">{path.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
