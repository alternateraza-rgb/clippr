"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

export function Field({
  value,
  onChange,
  placeholder,
  onSubmit,
  submitLabel = "Clip",
  className,
  autoFocus,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
  submitLabel?: string;
  className?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-[calc(var(--radius-control,9999px)+6px)] bg-surface p-1.5",
        "transition-all duration-[var(--dur-base,240ms)] ease-[var(--ease-out-soft)]",
        // The ring is the focus affordance, so the input itself needs none.
        focused ? "shadow-lift ring-1 ring-brand-tint/45" : "shadow-hairline",
        className,
      )}
    >
      <input
        value={value}
        autoFocus={autoFocus}
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSubmit?.();
        }}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent px-4 py-2.5 text-[15px] text-ink outline-none placeholder:text-muted disabled:opacity-50"
      />
      {onSubmit ? (
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled}
          className={cn(
            "shrink-0 rounded-[var(--radius-control,9999px)] bg-brand px-5 py-2.5 text-[14px] text-on-brand",
            "transition-all duration-[var(--dur-fast,140ms)] ease-[var(--ease-out-soft)]",
            "hover:bg-brand-hover active:scale-[0.98] disabled:opacity-40",
          )}
        >
          {submitLabel}
        </button>
      ) : null}
    </div>
  );
}
