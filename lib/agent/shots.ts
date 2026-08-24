import type { WordTiming } from "@/lib/agent/types";
import { isKeyword } from "@/lib/captions/motion";
import type { Interval } from "@/lib/agent/jumpcuts";

export type Shot = {
  /** Span on the source clip timeline. */
  start: number;
  end: number;
  /** 1 = widest 9:16 crop that fits, >1 punches in. */
  zoom: number;
  /** Horizontal centre of the crop, 0..1, or null to centre. */
  center: number | null;
};

const MIN_SHOT_S = 1.4;
const MAX_SHOT_S = 5.5;
/** A pause long enough to be a sentence boundary rather than a breath. */
const SENTENCE_GAP_S = 0.32;
/** Zoom levels, widest first. Steps are large enough that a cut between two of
 *  them reads as a deliberate punch rather than a glitch. */
const WIDE = 1.0;
const MID = 1.14;
const TIGHT = 1.28;
/** Reframing for less than this is visual noise, so hold the previous centre. */
const RECENTER_THRESHOLD = 0.06;
const LEVELS = [WIDE, MID, TIGHT];

function wordsIn(words: WordTiming[], start: number, end: number) {
  return words.filter((w) => w.end > start && w.start < end);
}

/**
 * Cut points inside one kept span: sentence boundaries first, then forced
 * splits so no framing outstays MAX_SHOT_S.
 */
function boundaries(words: WordTiming[], [start, end]: Interval, seams: number[] = []): number[] {
  const inside = wordsIn(words, start, end);
  const points: number[] = [start];

  // A seam is where the tape jumps to another part of the video. Always cut
  // there: holding one framing across a jump is what makes an assembled clip
  // look broken rather than edited.
  const forced = seams.filter((t) => t > start && t < end).sort((a, b) => a - b);

  for (let i = 0; i < inside.length - 1; i++) {
    const gap = inside[i + 1].start - inside[i].end;
    if (gap >= SENTENCE_GAP_S) {
      const at = inside[i].end + gap / 2;
      if (at - points[points.length - 1] >= MIN_SHOT_S) points.push(at);
    }
  }

  for (const at of forced) {
    if (!points.some((p) => Math.abs(p - at) < 0.25)) points.push(at);
  }
  points.sort((a, b) => a - b);

  // Long unbroken talking still needs cuts, or the shot sits static for the
  // whole clip — which is the thing that makes these read as unedited.
  const filled: number[] = [];
  for (let i = 0; i < points.length; i++) {
    filled.push(points[i]);
    const next = i + 1 < points.length ? points[i + 1] : end;
    let cursor = points[i];
    while (next - cursor > MAX_SHOT_S) {
      cursor += MAX_SHOT_S;
      filled.push(cursor);
    }
  }
  filled.push(end);
  return filled;
}

/**
 * Turns kept spans into shots with a framing each.
 *
 * The rhythm is the point: punch in when the line is doing the work, sit wider
 * when it is setup, and never repeat the same framing across a cut — an
 * invisible cut is worse than no cut, because the viewer feels the stall
 * without seeing the edit.
 */
export function planShots(
  keep: Interval[],
  words: WordTiming[],
  centerAt: (start: number, end: number) => number | null = () => null,
  seams: number[] = [],
): Shot[] {
  // Pass one: where the cuts fall, and how hot each resulting shot is.
  const spans: { start: number; end: number; heat: number }[] = [];
  for (const span of keep) {
    const points = boundaries(words, span, seams);
    for (let i = 0; i < points.length - 1; i++) {
      const start = points[i];
      const end = points[i + 1];
      if (end - start < 0.4) continue;
      const spoken = wordsIn(words, start, end);
      const density = spoken.length / Math.max(end - start, 0.5);
      const keywords = spoken.filter(isKeyword).length / Math.max(spoken.length, 1);
      spans.push({ start, end, heat: density + keywords * 3 });
    }
  }

  if (!spans.length) {
    return keep.map(([start, end]) => ({ start, end, zoom: WIDE, center: null }));
  }

  // Emphasis has to be relative to this clip, not an absolute threshold. A
  // speaker who stresses everything is a speaker who stresses nothing, and an
  // absolute bar just pins every shot to the same zoom — which is how the
  // rhythm ended up a metronome.
  const ranked = [...spans].map((s) => s.heat).sort((a, b) => a - b);
  const tightAbove = ranked[Math.floor(ranked.length * 0.66)];
  const midAbove = ranked[Math.floor(ranked.length * 0.33)];

  const shots: Shot[] = [];
  let previousZoom = WIDE;
  let beforePrevious = WIDE;
  let previousCenter: number | null = null;

  for (const span of spans) {
    let zoom = span.heat >= tightAbove ? TIGHT : span.heat >= midAbove ? MID : WIDE;
    // Two identical framings back to back means the cut does not read. Exclude
    // the previous two so the rhythm reaches for a third level instead of
    // ping-ponging between the same pair.
    if (zoom === previousZoom) {
      const options = LEVELS.filter((l) => l !== previousZoom && l !== beforePrevious);
      zoom = options[0] ?? LEVELS.find((l) => l !== previousZoom) ?? MID;
    }

    const tracked = centerAt(span.start, span.end);
    const center: number | null =
      tracked == null
        ? previousCenter
        : previousCenter != null && Math.abs(tracked - previousCenter) < RECENTER_THRESHOLD
          ? previousCenter
          : tracked;

    shots.push({ start: span.start, end: span.end, zoom, center });
    beforePrevious = previousZoom;
    previousZoom = zoom;
    previousCenter = center;
  }

  return shots;
}
