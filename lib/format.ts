export function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function formatTimestamp(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function formatRelativeDate(iso: string) {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function greetingForNow(name: string) {
  const hour = new Date().getHours();
  const time = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  // No name yet — before the profile loads, or for an account that never set
  // one. "Good afternoon, ." is worse than no name at all.
  const first = name.trim().split(" ")[0];
  return first ? `${time}, ${first}.` : `${time}.`;
}

export function weightedScore(scores: {
  hook: number;
  emotion: number;
  selfContained: number;
  quotability: number;
  payoff: number;
}) {
  return Math.round(
    scores.hook * 0.28 +
      scores.emotion * 0.18 +
      scores.selfContained * 0.2 +
      scores.quotability * 0.16 +
      scores.payoff * 0.18,
  );
}
