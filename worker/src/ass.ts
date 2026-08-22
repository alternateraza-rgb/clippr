import type { CaptionLine, CaptionPreset } from "../../lib/agent/types";
import {
  ASS_BOX,
  ASS_GOLD,
  ASS_INK,
  ASS_WHITE,
  ENTER_MS,
  PUNCH_MS,
  isKeyword,
} from "../../lib/captions/motion";

const W = 720;
const H = 1280;
const FONT = "Anton";
const HORM_SIZE = 64;
const CLEAN_SIZE = 54;

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
  const wholeSec = Math.floor(sec);
  const cs2 = Math.round((sec - wholeSec) * 100);
  return `${h}:${String(m).padStart(2, "0")}:${String(wholeSec).padStart(2, "0")}.${String(cs2).padStart(2, "0")}`;
}

function style(preset: CaptionPreset) {
  if (preset === "clean") {
    return `Style: Default,${FONT},${CLEAN_SIZE},&H00FFFFFF,&H000000FF,&H00000000,&H96000000,-1,0,0,0,100,100,0,0,1,6,0,2,40,40,170,1`;
  }
  if (preset === "karaoke") {
    return `Style: Default,${FONT},62,&H00FFFFFF,&H0000E5FF,&H00000000,&HA0000000,-1,0,0,0,100,100,0,0,1,5,0,2,40,40,170,1`;
  }
  return `Style: Default,${FONT},${HORM_SIZE},${ASS_WHITE},&H000000FF,&H00000000,${ASS_BOX},-1,0,0,0,100,100,-1,0,3,10,0,2,24,24,168,1`;
}

function karaokeLine(line: CaptionLine) {
  return line.words
    .map((word, i) => {
      const dur = Math.max(1, Math.round((word.end - word.start) * 100));
      const gap =
        i === 0 ? "" : `{\\k${Math.max(0, Math.round((word.start - line.words[i - 1].end) * 100))}}`;
      const pop = `{\\fscx35\\fscy50\\t(0,${ENTER_MS},\\fscx112\\fscy118)\\t(${ENTER_MS},${PUNCH_MS},\\fscx100\\fscy100)}`;
      return `${gap}${pop}{\\k${dur}}${assEscape(word.text)}`;
    })
    .join(" ");
}

function approxWidth(text: string, fontSize: number) {
  return text.length * fontSize * 0.56 + 36;
}

function hormoziEvents(line: CaptionLine) {
  const gap = 12;
  const labels = line.words.map((w) => w.text.replace(/[^\w'?]+/g, "").toUpperCase() || w.text.toUpperCase());
  const widths = labels.map((t) => approxWidth(t, HORM_SIZE));
  const total = widths.reduce((a, b) => a + b, 0) + gap * Math.max(0, line.words.length - 1);
  let x = (W - total) / 2;
  const y = H - 178;
  const goldIdx = line.words.findIndex((w) => isKeyword(w));

  return line.words
    .map((word, i) => {
      const cx = Math.round(x + widths[i] / 2);
      x += widths[i] + gap;
      const tilt = i % 2 === 0 ? -6 : 6;
      const start = ts(word.start);
      const end = ts(Math.max(word.end, line.end, word.start + 0.18));
      const peak = isKeyword(word) ? 132 : 122;
      const stayGold = i === goldIdx || isKeyword(word);
      const spokenCs = Math.max(8, Math.round((word.end - word.start) * 100));
      const goldAt = Math.max(ENTER_MS, 40);
      const color = stayGold
        ? `\\1c${ASS_INK}\\4c${ASS_GOLD}\\t(0,${goldAt},\\1c${ASS_INK}\\4c${ASS_GOLD})`
        : `\\1c${ASS_WHITE}\\4c${ASS_BOX}\\t(0,${goldAt},\\1c${ASS_INK}\\4c${ASS_GOLD})\\t(${goldAt + spokenCs * 10},${goldAt + spokenCs * 10 + 40},\\1c${ASS_WHITE}\\4c${ASS_BOX})`;
      const pop = `{\\an5\\pos(${cx},${y})\\fscx20\\fscy45\\frz${tilt}\\blur0.4${color}\\t(0,${ENTER_MS},\\fscx112\\fscy${peak}\\frz0\\blur0)\\t(${ENTER_MS},${PUNCH_MS},\\fscx100\\fscy100)}`;
      return `Dialogue: 0,${start},${end},Default,,0,0,0,,${pop}${assEscape(labels[i])}`;
    })
    .join("\n");
}

function cleanEvents(line: CaptionLine) {
  const start = ts(line.start);
  const end = ts(Math.max(line.end, line.start + 0.2));
  const rise = `{\\fscx80\\fscy80\\t(0,${ENTER_MS},\\fscx108\\fscy108)\\t(${ENTER_MS},${PUNCH_MS},\\fscx100\\fscy100)}`;
  const text = assEscape(line.words.map((w) => w.text).join(" "));
  return `Dialogue: 0,${start},${end},Default,,0,0,0,,${rise}${text}`;
}

export function buildAss(lines: CaptionLine[], preset: CaptionPreset) {
  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: ${W}
PlayResY: ${H}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
${style(preset)}

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const events = lines
    .filter((line) => line.words.length)
    .map((line) => {
      if (preset === "hormozi") return hormoziEvents(line);
      if (preset === "clean") return cleanEvents(line);
      const start = ts(line.start);
      const end = ts(Math.max(line.end, line.start + 0.2));
      return `Dialogue: 0,${start},${end},Default,,0,0,0,,${karaokeLine(line)}`;
    })
    .join("\n");

  return `${header}${events}\n`;
}

export const OUTPUT_SIZE = { width: W, height: H };
