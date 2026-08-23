import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { captionLinesForRange } from "../../lib/agent/compose";
import type { CaptionLine } from "../../lib/agent/types";
import { cutReencode, downloadSource } from "./media";
import { transcribeFile } from "./whisper";

export async function processRefine(videoId: string, start: number, end: number): Promise<{
  captionLines: CaptionLine[];
  words: number;
}> {
  if (!videoId) throw new Error("missing videoId");
  const from = Math.max(0, start);
  const to = Math.max(from + 4, end);
  const duration = Math.min(45, to - from);
  const dir = join(tmpdir(), "clipmuse-refine", `${videoId}-${from.toFixed(1)}`);
  await mkdir(dir, { recursive: true });
  try {
    const source = join(dir, "audio.m4a");
    const window = join(dir, "window.mp3");
    const downloaded = await downloadSource(videoId, source, "audio", {
      start: from,
      end: from + duration,
    });
    await cutReencode(source, window, from - downloaded.offset, duration, "audio");
    const transcript = await transcribeFile(window);
    if (!transcript.words.length) throw new Error("Whisper returned no words for this window");
    const last = transcript.words[transcript.words.length - 1]?.end ?? duration;
    return {
      captionLines: captionLinesForRange(transcript.words, 0, last + 0.05),
      words: transcript.words.length,
    };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => null);
  }
}
