import { cn } from "@/lib/cn";

export function Field({
  value,
  onChange,
  placeholder,
  onSubmit,
  className,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
  className?: string;
  autoFocus?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-full bg-surface px-2 py-2 shadow-hairline",
        className,
      )}
    >
      <input
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSubmit?.();
        }}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent px-4 py-2 text-[15px] text-ink outline-none placeholder:text-muted"
      />
      {onSubmit ? (
        <button
          type="button"
          onClick={onSubmit}
          className="shrink-0 rounded-full bg-brand px-5 py-2.5 text-[14px] text-on-brand transition-colors hover:bg-brand-hover"
        >
          Clip
        </button>
      ) : null}
    </div>
  );
}
