import { Reveal } from "@/components/motion/Reveal";
import { cn } from "@/lib/cn";

/**
 * Every band on the marketing site opens the same way: a small label, one tight
 * display line, an optional sentence. The repetition is what makes a scroll of
 * unrelated sections read as one page.
 */
export function SectionHead({
  eyebrow,
  title,
  lede,
  align = "left",
  className,
}: {
  eyebrow: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <Reveal
      className={cn(align === "center" && "mx-auto max-w-[720px] text-center", className)}
    >
      <p className="eyebrow text-brand">{eyebrow}</p>
      <h2
        className={cn(
          "display mt-4 text-[clamp(30px,4.6vw,52px)] text-ink",
          align === "left" && "max-w-[18ch]",
        )}
      >
        {title}
      </h2>
      {lede ? (
        <p
          className={cn(
            "mt-5 text-[16.5px] leading-relaxed text-body",
            align === "center" ? "mx-auto max-w-[52ch]" : "max-w-[52ch]",
          )}
        >
          {lede}
        </p>
      ) : null}
    </Reveal>
  );
}

export function Band({
  children,
  id,
  tone = "canvas",
  className,
}: {
  children: React.ReactNode;
  id?: string;
  tone?: "canvas" | "warm" | "dark";
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "px-6 py-20 md:py-28",
        tone === "warm" && "bg-surface-warm",
        tone === "dark" && "bg-void text-white",
        className,
      )}
    >
      <div className="mx-auto max-w-[1120px]">{children}</div>
    </section>
  );
}
