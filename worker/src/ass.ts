import type { CaptionLine } from "../../lib/agent/types";
import { ENTER_MS, PUNCH_MS } from "../../lib/captions/motion";

const W = 720;
const H = 1280;
const FONT = "Anton";
const SIZE = 62;
/** Distance from the bottom of frame to the caption baseline. Clear of both the
 *  platform UI and the lower third where faces usually sit. */
const MARGIN_V = 250;
/** Horizontal safe area. libass wraps inside this, so nothing can leave frame. */
const MARGIN_H = 56;

/** Spoken. */
const GOLD = "&H0069D9F5";
/** Not yet spoken. */
const WHITE = "&H00FFFFFF";
const OUTLINE = "&H00000000";

function assEscape(text: string) {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/\n/g, "\\N");
}

function ts(seconds: number) {
  const s = Math.max(0, seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const whole = Math.floor(sec);
  const cs = Math.round((sec - whole) * 100);
  return `${h}:${String(m).padStart(2, "0")}:${String(whole).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

/**
 * One event per line, with karaoke timing inside it.
 *
 * The previous version positioned every word individually with \pos, using
 * `text.length * fontSize * 0.56` as the width — a guess, with no wrapping and
 * no maximum, so long lines ran off both edges of the frame. Letting libass lay
 * the line out means the font is measured for real and MarginL/R are honoured,
 * which is why captions can no longer overflow.
 *
 * \k gives word-level highlighting with no layout shift at all: the glyphs
 * never move, they just change colour as each word is spoken. Timings come
 * straight from Whisper's word timestamps.
 */
function karaokeText(line: CaptionLine) {
  let cursor = line.start;
  const parts: string[] = [];

  for (const word of line.words) {
    // Silence before the word still has to be paid for in centiseconds, or
    // every later word in the line drifts early by the length of the pause.
    const lead = Math.max(0, Math.round((word.start - cursor) * 100));
    if (lead > 0) parts.push(`{\\k${lead}}​`);
    const dur = Math.max(1, Math.round((word.end - word.start) * 100));
    parts.push(`{\\kf${dur}}${assEscape(word.text.toUpperCase())}`);
    cursor = word.end;
  }

  // The line as a whole snaps in; individual words never rescale, so nothing
  // reflows mid-line.
  const enter = `{\\fscx88\\fscy88\\t(0,${ENTER_MS},\\fscx106\\fscy106)\\t(${ENTER_MS},${PUNCH_MS},\\fscx100\\fscy100)}`;
  return `${enter}${parts.join(" ")}`;
}

export function buildAss(lines: CaptionLine[]) {
  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: ${W}
PlayResY: ${H}
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.709

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${FONT},${SIZE},${GOLD},${WHITE},${OUTLINE},&H64000000,-1,0,0,0,100,100,0,0,1,7,3,2,${MARGIN_H},${MARGIN_H},${MARGIN_V},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const events = lines
    .filter((line) => line.words.length)
    .map((line) => {
      const start = ts(line.start);
      const end = ts(Math.max(line.end, line.start + 0.25));
      return `Dialogue: 0,${start},${end},Default,,0,0,0,,${karaokeText(line)}`;
    })
    .join("\n");

  return `${header}${events}\n`;
}

export const OUTPUT_SIZE = { width: W, height: H };
