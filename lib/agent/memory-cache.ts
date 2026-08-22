import { RUBRIC_VERSION } from "@/lib/config";
import type { AnalysisResult } from "@/lib/agent/types";
import type { TranscriptResult } from "@/lib/agent/transcript";

const analyses = new Map<string, AnalysisResult>();
const transcripts = new Map<string, TranscriptResult>();

export function analysisKey(videoId: string) {
  return `${videoId}:${RUBRIC_VERSION}`;
}

export function getCachedAnalysis(videoId: string) {
  const hit = analyses.get(analysisKey(videoId));
  if (hit?.candidates[0]?.id === "nc-1") return undefined;
  return hit;
}

export function setCachedAnalysis(videoId: string, result: AnalysisResult) {
  if (result.candidates[0]?.id === "nc-1") return;
  analyses.set(analysisKey(videoId), result);
}

export function getCachedTranscript(videoId: string) {
  return transcripts.get(videoId);
}

export function setCachedTranscript(videoId: string, result: TranscriptResult) {
  transcripts.set(videoId, result);
}
