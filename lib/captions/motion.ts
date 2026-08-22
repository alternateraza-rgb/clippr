import type { CaptionPreset, WordTiming } from "@/lib/agent/types";

export const ENTER_MS = 70;
export const PUNCH_MS = 160;
export const EXIT_MS = 90;
export const GOLD = "#F5E27A";
export const INK = "#0c0a09";
export const WHITE = "#ffffff";

const HOOK =
  /\b(nobody|secret|wait|actually|stop|never|always|here'?s|truth|don't|money|rich|broke|lost|won|insane|crazy|must|need|now)\b/i;

export function isKeyword(word: WordTiming) {
  const dur = Math.max(0, word.end - word.start);
  const token = word.text.replace(/[^a-zA-Z']/g, "");
  return dur >= 0.35 || HOOK.test(token);
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function easeOutBack(t: number) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const x = clamp01(t);
  return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2;
}

export type WordMotion = {
  opacity: number;
  scaleX: number;
  scaleY: number;
  y: number;
  rotate: number;
  fill: string;
  text: string;
  glow: number;
  punch: boolean;
  visible: boolean;
};

export function wordMotion(
  localMs: number,
  word: WordTiming,
  index: number,
  opts?: { stayGold?: boolean; preset?: CaptionPreset },
): WordMotion {
  const preset = opts?.preset ?? "hormozi";
  const keyword = isKeyword(word);
  const peak = keyword ? 1.32 : 1.22;
  const tilt = index % 2 === 0 ? -6 : 6;
  const spoken = localMs >= 0 && localMs <= Math.max(80, (word.end - word.start) * 1000);
  const stayGold = Boolean(opts?.stayGold || (keyword && localMs >= 0));

  if (localMs < 0) {
    return {
      opacity: 0,
      scaleX: 0.2,
      scaleY: 0.45,
      y: 22,
      rotate: tilt,
      fill: preset === "hormozi" ? WHITE : WHITE,
      text: preset === "hormozi" ? INK : WHITE,
      glow: 0,
      punch: false,
      visible: false,
    };
  }

  let scaleX = 1;
  let scaleY = 1;
  let y = 0;
  let rotate = 0;
  let opacity = 1;

  if (localMs < ENTER_MS) {
    const t = easeOutBack(localMs / ENTER_MS);
    scaleX = 0.2 + (1.12 - 0.2) * t;
    scaleY = 0.45 + (peak - 0.45) * t;
    y = 22 * (1 - t);
    rotate = tilt * (1 - t);
    opacity = clamp01(localMs / 36);
  } else if (localMs < PUNCH_MS) {
    const t = (localMs - ENTER_MS) / (PUNCH_MS - ENTER_MS);
    const bounce = t < 0.5 ? peak + (0.94 - peak) * (t / 0.5) : 0.94 + (1 - 0.94) * ((t - 0.5) / 0.5);
    scaleX = bounce;
    scaleY = bounce;
  }

  const gold = spoken || stayGold;
  const fill =
    preset === "hormozi"
      ? gold
        ? GOLD
        : WHITE
      : WHITE;
  const text =
    preset === "hormozi" ? (gold ? INK : WHITE) : WHITE;

  return {
    opacity,
    scaleX,
    scaleY,
    y,
    rotate,
    fill,
    text,
    glow: spoken ? 18 : gold && preset === "hormozi" ? 10 : 0,
    punch: spoken,
    visible: true,
  };
}

export function groupExit(time: number, lineEnd: number) {
  const remaining = lineEnd - time;
  if (remaining >= EXIT_MS / 1000 || remaining < 0) {
    return { opacity: 1, scale: 1 };
  }
  const t = clamp01(remaining / (EXIT_MS / 1000));
  return { opacity: t, scale: 0.92 + 0.08 * t };
}

/** ASS primary colour: gold #F5E27A → &H007AE2F5 */
export const ASS_GOLD = "&H007AE2F5";
export const ASS_WHITE = "&H00FFFFFF";
export const ASS_INK = "&H000A0C0C";
export const ASS_BOX = "&HE6000000";
