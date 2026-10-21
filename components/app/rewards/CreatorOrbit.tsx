"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/components/motion/usePrefersReducedMotion";

/**
 * The creators orbit your clip.
 *
 * One ring, turning slowly, with a 9:16 frame anchored at the middle — the
 * whole idea of the feature in one picture: their longform in the ring, your
 * cut in the centre. Faces stay upright because each portrait counter-spins
 * the ring exactly, so the ring travels and the face doesn't tumble.
 *
 * Five is the shape this is drawn for. Fewer, larger portraits read as people
 * rather than as decoration, which is the entire point of putting faces here —
 * eleven small discs was a pattern, not a cast.
 *
 * Positions and sizes are percentages of a square stage rather than pixels, so
 * the whole thing scales from a phone to a wide desktop without a single
 * breakpoint. Reduced motion keeps the arrangement and stops the travel.
 */

export type Creator = {
  name: string;
  /** Only for a file that doesn't match the slug convention below. */
  src?: string;
};

/**
 * Portraits live in `public/creators/`, named by slug: `iman-gadzhi.jpg`.
 *
 * Set to false to force monograms everywhere — useful before the files exist,
 * since it stops the page firing requests it can only get a 404 for. Any one
 * portrait that's missing or misnamed falls back to its monogram on its own,
 * so a partial set degrades cleanly either way.
 */
const HAS_PORTRAITS = true;

function portraitFor(creator: Creator): string | null {
  if (creator.src) return creator.src;
  if (!HAS_PORTRAITS) return null;
  const slug = creator.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `/creators/${slug}.jpg`;
}

/* The cast, until the real campaign list arrives from Whop. Order is the ring,
   clockwise from twelve — worth arranging by eye once the faces are in. */
const CREATORS: Creator[] = [
  { name: "Iman Gadzhi" },
  { name: "Andrew Tate" },
  { name: "Alex Hormozi" },
  { name: "Grant Cardone" },
  { name: "Luke Belmar" },
];

/* Geometry, in percent of the stage. Kept together because they only make
   sense against each other: the portraits have to clear the frame at the
   centre, and their name labels have to clear the frame too. */
const RADIUS = 37;
const SIZE = 17.5;
const SPIN_SECONDS = 58;

function initialsOf(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
}

export function CreatorOrbit() {
  const reduced = usePrefersReducedMotion();
  const spin = { duration: SPIN_SECONDS, repeat: Infinity, ease: "linear" } as const;

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

      {/* Tracks, drawn not floated — the same hairline logic as a card. The
          inner one carries nothing; it's there so the space between the frame
          and the ring reads as depth rather than as a gap. */}
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-[74%] w-[74%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-white/10"
      />
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-[46%] w-[46%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-white/[0.06]"
      />

      <ClipFrame reduced={reduced} />

      {/* The ring renders last so the portraits pass in front of the frame. */}
      <motion.div
        className="absolute inset-0"
        animate={reduced ? undefined : { rotate: 360 }}
        transition={spin}
      >
        {CREATORS.map((creator, i) => {
          // Start at twelve o'clock so the arrangement reads as deliberate.
          const angle = (i / CREATORS.length) * Math.PI * 2 - Math.PI / 2;
          return (
            <div
              key={creator.name}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${50 + RADIUS * Math.cos(angle)}%`,
                top: `${50 + RADIUS * Math.sin(angle)}%`,
                width: `${SIZE}%`,
              }}
            >
              {/* Equal and opposite: the ring carries the portrait around, this
                  keeps the face the right way up the whole trip. */}
              <motion.div
                className="relative"
                animate={reduced ? undefined : { rotate: -360 }}
                transition={spin}
              >
                <Face creator={creator} />
              </motion.div>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}

function Face({ creator }: { creator: Creator }) {
  // A portrait that 404s or fails to decode falls back rather than leaving a
  // torn image in the ring — the monogram is a real state, not an error state.
  const [broken, setBroken] = useState(false);
  const src = broken ? null : portraitFor(creator);

  return (
    <>
      {/* A container, so the monogram is sized by the portrait rather than by
          the page. */}
      <div
        style={{ containerType: "inline-size" }}
        className="relative aspect-square w-full overflow-hidden rounded-full bg-void-soft shadow-[inset_0_0_0_1px_rgb(255_255_255/0.16),0_10px_30px_rgb(0_0_0/0.45)]"
      >
        {src ? (
          <Image
            src={src}
            alt={creator.name}
            fill
            sizes="(min-width: 1024px) 96px, 18vw"
            className="object-cover"
            onError={() => setBroken(true)}
          />
        ) : (
          <span
            aria-hidden
            className="display flex h-full w-full items-center justify-center text-[30cqw] leading-none text-white/55"
          >
            {initialsOf(creator.name)}
          </span>
        )}
        {/* Drawn over the photo, so a bright headshot still ends on a defined
            edge instead of bleeding into the panel. */}
        <span
          aria-hidden
          className="absolute inset-0 rounded-full shadow-[inset_0_0_0_1px_rgb(255_255_255/0.18)]"
        />
        <span className="sr-only">{creator.name}</span>
      </div>
      <span className="absolute left-1/2 top-[calc(100%+10px)] -translate-x-1/2 whitespace-nowrap text-micro font-medium text-white/55">
        {creator.name}
      </span>
    </>
  );
}

/** Your cut, at the centre of everything they publish. */
function ClipFrame({ reduced }: { reduced: boolean }) {
  return (
    <div className="absolute left-1/2 top-1/2 h-[32%] -translate-x-1/2 -translate-y-1/2">
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
