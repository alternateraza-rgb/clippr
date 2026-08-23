import type { Transition, Variants } from "framer-motion";

/**
 * One curve for the whole workspace.
 *
 * Timings were previously typed per component — 200ms here, 300ms and a
 * different easing there — which is most of why the app felt assembled rather
 * than designed. Everything animating on the same curve is what reads as
 * "polished" before anyone can say why.
 */
export const EASE = [0.2, 0.8, 0.2, 1] as const;

export const fast: Transition = { duration: 0.14, ease: EASE };
export const base: Transition = { duration: 0.24, ease: EASE };
export const slow: Transition = { duration: 0.52, ease: EASE };

/** For anything that should feel physical under a cursor — buttons, cards. */
export const springy: Transition = { type: "spring", stiffness: 420, damping: 32, mass: 0.7 };

/** Lists reveal in sequence rather than all at once. */
export const stagger = (delayChildren = 0.04): Variants => ({
  hidden: {},
  show: {
    transition: { staggerChildren: 0.045, delayChildren },
  },
});

export const riseIn: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: base },
};

/** Reduced-motion equivalents: state still changes, nothing travels. */
export const riseInStill: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: fast },
};
