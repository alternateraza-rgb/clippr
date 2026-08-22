import type { CaptionLine, CaptionPreset } from "../../lib/agent/types";

const W = 720;
const H = 1280;

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
    return "Style: Default,Liberation Sans,54,&H00FFFFFF,&H000000FF,&H00000000,&H96000000,-1,0,0,0,100,100,0,0,1,3,2,2,40,40,140,1";
  }
  if (preset === "karaoke") {
    return "Style: Default,Liberation Sans,62,&H00FFFFFF,&H0000E5FF,&H00000000,&HA0000000,-1,0,0,0,100,100,0,0,1,4,2,2,40,40,160,1";
  }
  return "Style: Default,Liberation Sans,60,&H00FFFFFF,&H0000FFFF,&H00000000,&HE6000000,-1,0,0,0,100,100,0,0,3,12,0,5,40,40,0,1";
}

function karaokeLine(line: CaptionLine) {
  return line.words
    .map((word, i) => {
      const dur = Math.max(1, Math.round((word.end - word.start) * 100));
      const gap =
        i === 0 ? "" : `{\\k${Math.max(0, Math.round((word.start - line.words[i - 1].end) * 100))}}`;
      return `${gap}{\\k${dur}}${assEscape(word.text)}`;
    })
    .join(" ");
}

function hormoziEvents(line: CaptionLine) {
  const pop = "{\\fscx60\\fscy60\\t(0,90,\\fscx112\\fscy112)\\t(90,150,\\fscx100\\fscy100)}";
  const fill = karaokeLine(line);
  const start = ts(line.start);
  const end = ts(Math.max(line.end, line.start + 0.2));
  return `Dialogue: 0,${start},${end},Default,,0,0,0,,${pop}${fill}`;
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
      const start = ts(line.start);
      const end = ts(Math.max(line.end, line.start + 0.2));
      const text =
        preset === "clean"
          ? assEscape(line.words.map((w) => w.text).join(" "))
          : karaokeLine(line);
      return `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}`;
    })
    .join("\n");

  return `${header}${events}\n`;
}

export const OUTPUT_SIZE = { width: W, height: H };
