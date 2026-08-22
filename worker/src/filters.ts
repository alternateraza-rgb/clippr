export type Interval = [number, number];

/** `y` offset fraction for the vertical crop: 0.5 is centered, lower keeps more of the top of frame in view. */
export const CROP_BIAS_Y = 0.32;

function n(x: number) {
  return x.toFixed(3);
}

/**
 * Builds the trim+concat portion of a filter_complex that removes the given
 * jump-cut spans from a single video+audio input, re-basing PTS on each kept
 * segment before rejoining them into one continuous stream. Returns "" (a
 * no-op) when there's nothing to cut, so callers can skip it entirely.
 */
export function jumpCutChain(
  keep: Interval[],
  input: { v: string; a: string },
  output: { v: string; a: string },
): string {
  if (keep.length <= 1) return "";
  const parts: string[] = [];
  keep.forEach(([s, e], i) => {
    parts.push(`[${input.v}]trim=start=${n(s)}:end=${n(e)},setpts=PTS-STARTPTS[jv${i}]`);
    parts.push(`[${input.a}]atrim=start=${n(s)}:end=${n(e)},asetpts=PTS-STARTPTS[ja${i}]`);
  });
  const labels = keep.map((_, i) => `[jv${i}][ja${i}]`).join("");
  parts.push(`${labels}concat=n=${keep.length}:v=1:a=1[${output.v}][${output.a}]`);
  return parts.join(";");
}

/** Object-cover style crop biased toward the top of frame instead of dead-center. */
export function biasedCrop(width: number, height: number, biasY = CROP_BIAS_Y) {
  return `crop=${width}:${height}:(iw-${width})/2:(ih-${height})*${biasY}`;
}

/**
 * A slow, constant Ken Burns zoom. Must run on an already-correctly-framed
 * stream whose input and output dimensions match (i.e. after the crop, not
 * before) — zoompan does not itself preserve aspect ratio the way `crop`
 * does, so feeding it a differently-shaped source would squish the frame
 * instead of cropping it.
 *
 * `fps` should be the source's real frame rate (probe it, don't guess): with
 * `d=1`, zoompan emits exactly one output frame per input frame, so a wrong
 * `fps` value changes apparent playback speed instead of just the zoom.
 */
export function kenBurnsZoom(width: number, height: number, fps: number) {
  const safeFps = Number.isFinite(fps) && fps > 1 ? fps : 30;
  return (
    `zoompan=z='min(zoom+0.0012,1.07)':d=1:` +
    `x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${width}x${height}:fps=${safeFps.toFixed(3)}`
  );
}
