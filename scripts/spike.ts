/**
 * Prove the clipping pipeline on real YouTube videos.
 * Usage: npx tsx scripts/spike.ts [videoId ...]
 */
import "../lib/load-env";
import { scoreTranscript } from "../lib/agent/score";
import { fetchTranscript } from "../lib/agent/transcript";
import { hydrateVideo } from "../lib/youtube/meta";

const DEFAULTS = [
  "UF8uR6Z6KLc", // speech
  "aircAruvnKk", // lecture
  "jNQXAC9IVRw", // short talking head
];

async function runOne(videoId: string) {
  const t0 = Date.now();
  console.log("\n==", videoId, "==");
  const video = await hydrateVideo(videoId);
  console.log("meta", video.title, "·", video.channel, "·", `${video.durationS}s`, `in ${Date.now() - t0}ms`);
  const transcript = await fetchTranscript(videoId);
  console.log(
    "transcript",
    transcript.words.length,
    "words ·",
    transcript.segments.length,
    "segments",
  );
  const scored = await scoreTranscript(transcript, "podcasts");
  console.log(
    "score",
    scored.meta.source,
    scored.meta.model,
    `${scored.meta.ms}ms`,
    `${scored.meta.tokens} tokens`,
  );
  for (const c of scored.candidates) {
    console.log(
      `  [${c.score}] ${c.start.toFixed(1)}–${c.end.toFixed(1)}  ${c.hook}\n      ${c.whyItClips}\n      captions ${c.captionLines.length} lines`,
    );
  }
  return scored.candidates.length;
}

async function main() {
  const ids = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULTS;
  let total = 0;
  for (const id of ids) {
    try {
      total += await runOne(id);
    } catch (error) {
      console.error("FAIL", id, error instanceof Error ? error.message : error);
    }
  }
  if (!total) {
    process.exitCode = 1;
  }
}

main();
