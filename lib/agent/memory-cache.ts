import { RUBRIC_VERSION, hasLlm } from "@/lib/config";
import type { AnalysisResult } from "@/lib/agent/types";
import type { TranscriptResult } from "@/lib/agent/transcript";

const analyses = new Map<string, AnalysisResult>();
const transcripts = new Map<string, TranscriptResult>();

export function analysisKey(videoId: string) {
  return `${videoId}:${RUBRIC_VERSION}`;
}

function isHeuristic(result: AnalysisResult) {
  return (
    result.scoreSource === "heuristic" || Boolean(result.candidates[0]?.id?.startsWith("h-"))
  );
}

export function getCachedAnalysis(videoId: string) {
  const hit = analyses.get(analysisKey(videoId));
  if (!hit) return undefined;
  if (hit.candidates[0]?.id === "nc-1") return undefined;
  if (hasLlm() && isHeuristic(hit)) return undefined;
  return hit;
}

export function setCachedAnalysis(videoId: string, result: AnalysisResult) {
  if (result.candidates[0]?.id === "nc-1") return;
  if (hasLlm() && isHeuristic(result)) return;
  analyses.set(analysisKey(videoId), result);
}

export function clearCachedAnalysis(videoId: string) {
  analyses.delete(analysisKey(videoId));
}

export function getCachedTranscript(videoId: string) {
  return transcripts.get(videoId);
}

export function setCachedTranscript(videoId: string, result: TranscriptResult) {
  transcripts.set(videoId, result);
}
