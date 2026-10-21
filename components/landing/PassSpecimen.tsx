/**
 * Four small drawings of what the product actually does to a video.
 *
 * These replaced four identical lucide icons in tinted rounded squares — the
 * most recognisable generated-layout there is, and a direct contradiction of
 * the house rule that decoration is spent on the accent and on real product
 * surfaces. A waveform, a cut list, a crop box and a burnt-in caption *are*
 * the four passes; an icon of a pair of scissors is a picture of the word.
 *
 * Deliberately drawn in the same hairline-and-accent vocabulary as the rest of
 * the system, at one fixed height so the four cells line up.
 */

const FRAME = "flex h-16 items-end";

/** Every word, timed to the audio. */
export function WaveSpecimen() {
  // Fixed heights: a real-looking envelope beats Math.random(), which would
  // also re-roll on the client and trip hydration.
  const bars = [
    18, 34, 26, 48, 62, 40, 72, 88, 64, 46, 80, 96, 70, 52, 38, 58, 44, 30, 22, 34,
  ];
  return (
    <div className={FRAME} aria-hidden>
      <div className="flex h-full w-full items-center gap-[3px]">
        {bars.map((h, i) => (
          <span
            key={i}
            style={{ height: `${h}%` }}
            className={`w-full rounded-full ${
              i >= 7 && i <= 12 ? "bg-brand" : "bg-hairline-strong"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

/** Setup, beat, turn, payoff — assembled from wherever they sit on the tape. */
export function CutSpecimen() {
  const takes = [
    { left: "4%", width: "13%" },
    { left: "27%", width: "9%" },
    { left: "48%", width: "17%" },
    { left: "78%", width: "11%" },
  ];
  return (
    <div className={`${FRAME} items-center`} aria-hidden>
      <div className="relative h-full w-full">
        {/* The tape. */}
        <span className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-hairline" />
        {/* The moments that carry the story. */}
        {takes.map((take, i) => (
          <span
            key={i}
            style={take}
            className="absolute top-1/2 h-[14px] -translate-y-1/2 rounded-[3px] bg-brand"
          />
        ))}
        {/* Where the cuts land. */}
        {takes.map((take, i) => (
          <span
            key={`t${i}`}
            style={{ left: take.left }}
            className="absolute top-0 h-3 w-px bg-hairline-strong"
          />
        ))}
      </div>
    </div>
  );
}

/** Vertical 9:16, punched in on whoever is talking. */
export function FrameSpecimen() {
  return (
    <div className={`${FRAME} items-center`} aria-hidden>
      <div className="relative h-full">
        {/* The 16:9 source. */}
        <div className="h-full w-[114px] rounded-[4px] border border-hairline-strong bg-surface-warm" />
        {/* The crop that gets posted. */}
        <div className="absolute inset-y-[-6px] left-[38px] w-[38px] rounded-[4px] border-2 border-brand bg-brand/5" />
        {/* Whoever is talking. */}
        <span className="absolute left-[53px] top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand" />
      </div>
    </div>
  );
}

/** Burned in on the beat, in the style that holds people. */
export function CaptionSpecimen() {
  return (
    <div className={`${FRAME} items-center`} aria-hidden>
      <p className="font-caption text-burn text-ink">
        THEY <span className="bg-brand px-1.5 text-on-brand">NEVER</span> SAW
      </p>
    </div>
  );
}
