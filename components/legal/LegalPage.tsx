import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingNav } from "@/components/landing/LandingNav";

/**
 * Shared shell for the policy pages. They exist to be read and to be checked by
 * a payment processor, so the priority is legibility over decoration: one
 * column, real line length, obvious headings.
 */
export function LegalPage({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  updated: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-canvas">
      <LandingNav />

      <article className="mx-auto max-w-[720px] px-6 pb-24 pt-16 md:pt-24">
        <p className="eyebrow text-brand">Clipmuse</p>
        <h1 className="display mt-4 text-[clamp(32px,5vw,48px)] text-ink">{title}</h1>
        <p className="mt-3 text-[13px] text-muted">Last updated {updated}</p>
        {intro ? (
          <p className="mt-6 text-[17px] leading-relaxed text-body">{intro}</p>
        ) : null}

        <div className="mt-12 space-y-10">{children}</div>
      </article>

      <LandingFooter />
    </div>
  );
}

export function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="display text-[21px] text-ink">{heading}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-body">{children}</div>
    </section>
  );
}

export function List({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="mt-1 space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span aria-hidden className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-brand" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
