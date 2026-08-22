/** Parse a clip offset from LLM JSON: seconds, ms, or clock strings like 8:42 / 1:12:08. */
export function parseOffset(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value < 0) return null;
    return value > 100_000 ? value / 1000 : value;
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const n = Number(trimmed);
    return n > 100_000 ? n / 1000 : n;
  }
  const parts = trimmed.split(":").map((p) => Number(p.replace(",", ".")));
  if (!parts.length || parts.some((p) => !Number.isFinite(p))) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return null;
}

export function pickOffset(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const parsed = parseOffset(row[key]);
    if (parsed != null) return parsed;
  }
  return null;
}
