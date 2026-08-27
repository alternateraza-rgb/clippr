"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { fast } from "@/components/motion/presets";
import { usePrefersReducedMotion } from "@/components/motion/usePrefersReducedMotion";
import { cn } from "@/lib/cn";

/**
 * The one thing the product does, and the one control that does it. Dark, so
 * it reads as the primary surface rather than another card in a stack.
 *
 * This was duplicated verbatim between Home and Studio, which meant two copies
 * of the only control that matters — and two chances for them to drift apart.
 *
 * The panel brightens its edge while the field has focus. It's the single
 * ambient move in the workspace, and it's tied to something the user did
 * rather than running on a timer.
 */
export function UrlPaste({
  value,
  onChange,
  onSubmit,
  placeholder,
  error,
  hint,
  children,
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  onSubmit: () => void;
  placeholder: string;
  error?: string;
  hint?: string;
  /** Heading and lede, when the surface has to introduce itself. */
  children?: React.ReactNode;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const [focused, setFocused] = useState(false);

  return (
    <section
      className={cn(
        "overflow-hidden rounded-panel bg-void p-6 text-white md:p-8",
        "transition-shadow duration-[var(--dur-base)] ease-[var(--ease-out-soft)]",
        focused ? "shadow-[0_0_0_1px_var(--color-brand)]" : "shadow-[0_0_0_1px_transparent]",
        className,
      )}
    >
      {children}

      <div className={cn("flex flex-col gap-2.5 sm:flex-row", Boolean(children) && "mt-6")}>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSubmit();
          }}
          placeholder={placeholder}
          aria-label="YouTube link"
          aria-invalid={error ? true : undefined}
          className={cn(
            "min-w-0 flex-1 rounded-full bg-white/10 px-5 py-3.5 text-md text-white outline-none",
            "ring-1 ring-inset ring-white/15 transition-shadow duration-[var(--dur-fast)]",
            "placeholder:text-white/40 focus:ring-2 focus:ring-white/60",
          )}
        />
        <button
          type="button"
          onClick={onSubmit}
          className={cn(
            "shrink-0 rounded-full bg-brand px-7 py-3.5 text-md font-semibold text-on-brand",
            "shadow-[inset_0_1px_0_rgb(255_255_255/0.22)]",
            "transition-colors duration-[var(--dur-fast)] hover:bg-brand-hover active:scale-[0.98]",
          )}
        >
          Clip it
        </button>
      </div>

      {error ? (
        <motion.p
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={fast}
          className="mt-3 text-sm text-brand-tint"
        >
          {error}
        </motion.p>
      ) : null}

      {hint ? <p className="mt-4 text-caption text-white/40">{hint}</p> : null}
    </section>
  );
}
