"use client";

import { cn } from "@/lib/cn";
import type { AgentEvent, AgentStage } from "@/lib/agent/types";

const ORDER: AgentStage[] = ["resolve", "transcribe", "score", "compose", "done"];

export function AgentTimeline({
  events,
  cursor,
}: {
  events: AgentEvent[];
  cursor: number;
}) {
  const visible = events.filter((e) => e.at <= cursor);
  const current = visible[visible.length - 1];

  return (
    <ol className="space-y-3">
      {ORDER.map((stage) => {
        const last = [...visible].reverse().find((e) => e.stage === stage);
        const active = current?.stage === stage && stage !== "done";
        const done =
          last &&
          (stage === "done" ||
            ORDER.indexOf(current?.stage ?? "resolve") > ORDER.indexOf(stage));
        return (
          <li key={stage} className="flex gap-3">
            <span
              className={cn(
                "mt-1 h-2 w-2 shrink-0 rounded-full",
                done ? "bg-brand" : active ? "bg-brand-tint" : "bg-hairline",
              )}
            />
            <div>
              <p className="text-[12px] uppercase tracking-[0.12em] text-muted">
                {stage}
              </p>
              <p className={cn("mt-1 text-[14px]", done || active ? "text-ink" : "text-muted")}>
                {last?.message ?? "Waiting…"}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
