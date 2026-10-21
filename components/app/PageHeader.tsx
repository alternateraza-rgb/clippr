import { cn } from "@/lib/cn";

/**
 * Every workspace page opens the same way: label, one display line, a sentence
 * of orientation, optional action. Repetition is what makes separate pages feel
 * like one app.
 */
export function PageHeader({
  eyebrow,
  title,
  lede,
  action,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-wrap items-end justify-between gap-x-6 gap-y-4", className)}>
      <div className="min-w-0">
        {eyebrow ? <p className="eyebrow text-brand">{eyebrow}</p> : null}
        <h1 className="display mt-2.5 text-d4 text-ink">{title}</h1>
        {lede ? (
          <p className="mt-3 max-w-[56ch] text-md text-body">{lede}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
