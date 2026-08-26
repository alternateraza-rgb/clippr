import { cn } from "@/lib/cn";

/**
 * One titled block of settings. Every section on the page is this shape, so the
 * page reads as a list of decisions rather than a pile of controls.
 */
export function SettingsSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "grid gap-5 border-t border-hairline py-8 md:grid-cols-[minmax(0,210px)_1fr] md:gap-10",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        {description ? (
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{description}</p>
        ) : null}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

/** A labelled row inside a section: what it is on the left, the value right. */
export function SettingsRow({
  label,
  value,
  action,
}: {
  label: string;
  value: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-[12.5px] text-muted">{label}</p>
        <div className="mt-0.5 truncate text-[15px] text-ink">{value}</div>
      </div>
      {action}
    </div>
  );
}
