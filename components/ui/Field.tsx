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
  icon,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
  submitLabel?: string;
  className?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-[var(--radius-pill)] bg-surface p-1.5 pl-2",
        "transition-shadow duration-[var(--dur-base)] ease-[var(--ease-out-soft)]",
        focused
          ? "shadow-[inset_0_0_0_1.5px_var(--color-ink)]"
          : "shadow-[inset_0_0_0_1px_var(--color-hairline)] hover:shadow-[inset_0_0_0_1px_var(--color-hairline-strong)]",
        className,
      )}
    >
      {icon ? <span className="pl-2 text-muted">{icon}</span> : null}
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
        // The wrapper carries the focus affordance, so the input needs none.
        className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-[15px] text-ink outline-none placeholder:text-muted disabled:opacity-50"
      />
      {onSubmit ? (
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled}
          className={cn(
            "h-10 shrink-0 rounded-[var(--radius-pill)] bg-brand px-5 text-[14px] font-medium text-on-brand",
            "shadow-[inset_0_1px_0_rgb(255_255_255/0.22)]",
            "transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out-soft)]",
            "hover:bg-brand-hover active:scale-[0.98] disabled:opacity-40",
          )}
        >
          {submitLabel}
        </button>
      ) : null}
    </div>
  );
}
