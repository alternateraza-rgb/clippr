import type { ScoreBreakdown as Scores } from "@/lib/agent/types";

const LABELS: Array<[keyof Scores, string]> = [
  ["hook", "Hook"],
  ["emotion", "Emotion"],
  ["selfContained", "Self-contained"],
  ["quotability", "Quotable"],
  ["payoff", "Payoff"],
];

export function ScoreBreakdown({ scores }: { scores: Scores }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-[13px]">
      {LABELS.map(([key, label]) => (
        <div key={key} className="flex justify-between gap-3">
          <dt className="text-muted">{label}</dt>
          <dd className="tabular-nums text-ink">{scores[key]}</dd>
        </div>
      ))}
    </dl>
  );
}
