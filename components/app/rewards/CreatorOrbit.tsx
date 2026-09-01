"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/components/motion/usePrefersReducedMotion";

/**
 * The creators orbit your clip.
 *
 * Two dashed tracks, counter-rotating, with a 9:16 frame anchored at the
 * middle — the whole idea of the feature in one picture: their longform in
 * the ring, your cut in the centre. Faces stay upright because each one
 * counter-spins its own ring, so the ring travels and the portrait doesn't
 * tumble.
 *
 * Positions are percentages of a square stage rather than pixels, so the
 * whole thing scales from a phone to a wide desktop without a single
 * breakpoint. Reduced motion keeps the arrangement and stops the travel.
 */

export type Creator = {
  name: string;
  /** Drop a file in `public/creators/` and point at it — until then, a monogram. */
  src?: string;
};

/* The cast, until the real campaign list arrives from Whop. Swapping a name or
   adding a portrait is a one-line edit here. */
const OUTER: Creator[] = [
  { name: "Iman Gadzhi" },
  { name: "Andrew Tate" },
  { name: "Alex Hormozi" },
  { name: "Luke Belmar" },
  { name: "Grant Cardone" },
  { name: "Dan Koe" },
];

const INNER: Creator[] = [
  { name: "Sam Ovens" },
  { name: "Ali Abdaal" },
  { name: "Cole Gordon" },
  { name: "Charlie Morgan" },
  { name: "Myron Gaines" },
];

function initialsOf(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
}

export function CreatorOrbit() {
  const reduced = usePrefersReducedMotion();

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[540px]">
      {/* The one piece of light in the picture, sitting behind the frame so the
          centre reads as lit rather than as a coloured shape. */}
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-[62%] w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-70 blur-2xl"
        style={{
          background:
            "radial-gradient(circle, rgb(255 74 23 / 0.28), rgb(255 74 23 / 0) 68%)",
        }}
      />

      {/* Tracks, drawn not floated — the same hairline logic as a card. */}
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-[79%] w-[79%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-white/10"
      />
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-[40%] w-[40%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-white/[0.07]"
      />

      <Ring
        creators={INNER}
        radiusPct={20}
        sizePct={8.5}
        duration={34}
        clockwise={false}
        reduced={reduced}
      />

      <ClipFrame reduced={reduced} />

      {/* Outer ring last so its portraits pass in front of the frame. */}
      <Ring
        creators={OUTER}
        radiusPct={39.5}
        sizePct={12.5}
        duration={46}
        clockwise
        showNames
        reduced={reduced}
      />
    </div>
  );
}

function Ring({
  creators,
  radiusPct,
  sizePct,
  duration,
  clockwise,
  showNames = false,
  reduced,
}: {
  creators: Creator[];
  radiusPct: number;
  /** Width as a share of the stage, so a portrait scales with the ring it rides. */
  sizePct: number;
  duration: number;
  clockwise: boolean;
  showNames?: boolean;
  reduced: boolean;
}) {
  const spin = { duration, repeat: Infinity, ease: "linear" } as const;
  const ringTo = clockwise ? 360 : -360;

  return (
    <motion.div
      className="absolute inset-0"
      animate={reduced ? undefined : { rotate: ringTo }}
      transition={spin}
    >
      {creators.map((creator, i) => {
        // Start at twelve o'clock so the arrangement reads as deliberate.
        const angle = (i / creators.length) * Math.PI * 2 - Math.PI / 2;
        return (
          <div
            key={creator.name}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${50 + radiusPct * Math.cos(angle)}%`,
              top: `${50 + radiusPct * Math.sin(angle)}%`,
              width: `${sizePct}%`,
            }}
          >
            {/* Equal and opposite: the ring carries the portrait around, this
                keeps the face the right way up the whole trip. */}
            <motion.div
              className="relative"
              animate={reduced ? undefined : { rotate: -ringTo }}
              transition={spin}
            >
              <Face creator={creator} showName={showNames} />
            </motion.div>
          </div>
        );
      })}
    </motion.div>
  );
}

function Face({ creator, showName }: { creator: Creator; showName: boolean }) {
  return (
    <>
      {/* A container, so the monogram is sized by the portrait rather than by
          the page — the two rings render the same face at two scales. */}
      <div
        style={{ containerType: "inline-size" }}
        className="relative aspect-square w-full overflow-hidden rounded-full bg-void-soft shadow-[inset_0_0_0_1px_rgb(255_255_255/0.14)]"
      >
        {creator.src ? (
          <Image
            src={creator.src}
            alt={creator.name}
            fill
            sizes="(min-width: 1024px) 70px, 12vw"
            className="object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="display flex h-full w-full items-center justify-center text-[30cqw] leading-none text-white/55"
          >
            {initialsOf(creator.name)}
          </span>
        )}
        <span className="sr-only">{creator.name}</span>
      </div>
      {showName ? (
        <span className="absolute left-1/2 top-[calc(100%+7px)] hidden -translate-x-1/2 whitespace-nowrap text-micro font-medium text-white/50 sm:block">
          {creator.name}
        </span>
      ) : null}
    </>
  );
}

/** Your cut, at the centre of everything they publish. */
function ClipFrame({ reduced }: { reduced: boolean }) {
  return (
    <div className="absolute left-1/2 top-1/2 h-[28%] -translate-x-1/2 -translate-y-1/2">
      <motion.div
        className="relative flex h-full flex-col items-center justify-end overflow-hidden rounded-card bg-void px-2 pb-3 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.16)]"
        style={{ aspectRatio: "9 / 16" }}
        animate={reduced ? undefined : { y: [0, -6, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: [0.4, 0, 0.6, 1] }}
      >
        <span
          aria-hidden
          className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand shadow-brand"
        />
        <span
          aria-hidden
          className="absolute left-1/2 top-1/2 -translate-y-1/2 translate-x-[-38%] border-y-[6px] border-l-[10px] border-y-transparent border-l-white"
        />
        <p className="relative text-center font-caption text-micro leading-tight tracking-wide text-white/80">
          YOUR CLIP
        </p>
      </motion.div>
    </div>
  );
}
