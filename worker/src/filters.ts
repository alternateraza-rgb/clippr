import type { Shot } from "../../lib/agent/shots";

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
 * Builds the whole video chain: each shot trimmed from the source, cropped to
 * its own framing, scaled to output size, then concatenated.
 *
 * This replaces the old zoompan Ken Burns pass, and fixes two things at once.
 * A per-shot `crop` is constant within the shot, so nothing has to be evaluated
 * per frame and no filter rewrites PTS — which is what made burned-in captions
 * drift behind the audio. And cutting between fixed framings is what an editor
 * actually does; a 0.0012/frame creep is invisible.
 */
export function shotChain(
  shots: Shot[],
  source: { width: number; height: number },
  output: { width: number; height: number },
  input: { v: string; a: string },
  out: { v: string; a: string },
): string {
  if (!shots.length) return "";
  const parts: string[] = [];

  shots.forEach((shot, i) => {
    const { w, h, x, y } = cropRect(shot, source, output);
    parts.push(
      `[${input.v}]trim=start=${n(shot.start)}:end=${n(shot.end)},setpts=PTS-STARTPTS,` +
        `crop=${w}:${h}:${x}:${y},scale=${output.width}:${output.height},setsar=1[sv${i}]`,
    );
    parts.push(`[${input.a}]atrim=start=${n(shot.start)}:end=${n(shot.end)},asetpts=PTS-STARTPTS[sa${i}]`);
  });

  const labels = shots.map((_, i) => `[sv${i}][sa${i}]`).join("");
  parts.push(`${labels}concat=n=${shots.length}:v=1:a=1[${out.v}][${out.a}]`);
  return parts.join(";");
}

/** Even numbers only — odd crop dimensions break yuv420p encoding. */
function even(value: number) {
  return Math.max(2, Math.round(value / 2) * 2);
}

/**
 * The crop window for one shot: the tallest region matching the output aspect,
 * divided by the zoom, positioned on the speaker where we know where they are.
 */
export function cropRect(
  shot: Shot,
  source: { width: number; height: number },
  output: { width: number; height: number },
) {
  const aspect = output.width / output.height;
  const baseHeight = Math.min(source.height, source.width / aspect);
  const zoom = Math.max(1, shot.zoom);
  const h = even(Math.min(source.height, baseHeight / zoom));
  const w = even(Math.min(source.width, h * aspect));

  const centerX = shot.center == null ? 0.5 : shot.center;
  const x = even(Math.min(Math.max(centerX * source.width - w / 2, 0), source.width - w));
  const y = even(Math.min(Math.max((source.height - h) * CROP_BIAS_Y, 0), source.height - h));
  return { w, h, x, y };
}
