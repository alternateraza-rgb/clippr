import { Band, SectionHead } from "@/components/landing/Section";
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
    <Band id="get-paid">
      <SectionHead
        eyebrow="The money"
        title={
          <>
            Three ways this makes you <span className="text-brand">money</span>.
          </>
        }
      />
      <Reveal className="mt-14 grid gap-5 md:grid-cols-3">
        {PATHS.map((path) => (
          <article
            key={path.n}
            className="flex h-full flex-col rounded-card bg-surface-warm p-7"
          >
            <span className="tnum text-caption font-semibold text-brand">{path.n}</span>
            <h3 className="display mt-4 text-d1 text-ink">{path.title}</h3>
            <p className="mt-3 text-md text-body">{path.body}</p>
          </article>
        ))}
      </Reveal>
    </Band>
  );
}
