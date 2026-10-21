import { asGenre } from "@/lib/fixtures/niches";
import { signedClipUrl } from "@/lib/supabase/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { StorageProvider } from "@/lib/storage/r2";
import type { ReelRecord, SourceVideo, StatsPayload } from "@/lib/stats/types";

/**
 * Only the parts of the candidate a chart reads. `moment` also carries caption
 * lines with a timing for every word, which is most of its weight.
 */
const COLUMNS = [
  "id",
  "video_id",
  "status",
  "created_at",
  "finished_at",
  "duration_s",
  "gameplay",
  "caption_preset",
  "asr_source",
  "output_path",
  "storage",
  "topic:moment->>topic",
  "hook:moment->>hook",
  "score:moment->score",
  "scores:moment->scores",
  "segments:moment->segments",
];

type Row = {
  id: string;
  video_id: string;
  status: ReelRecord["status"];
  created_at: string;
  finished_at: string | null;
  duration_s: number | string | null;
  gameplay: ReelRecord["gameplay"];
  caption_preset: ReelRecord["captionPreset"];
  asr_source: ReelRecord["asrSource"];
  output_path: string | null;
  storage: string | null;
  genre?: string | null;
  topic: string | null;
  hook: string | null;
  score: number | null;
  scores: ReelRecord["scores"];
  segments: { role?: string; start?: number; end?: number }[] | null;
};

/** How many of the best reels get a poster. Each one is a signed URL. */
const POSTERS = 3;

async function client() {
  return createAdminClient() ?? (await createClient());
}

export async function loadReelStats(userId: string): Promise<StatsPayload> {
  const supabase = await client();
  if (!supabase) return { reels: [], videos: {}, posters: {}, unsorted: 0 };

  const read = (columns: string[]) =>
    supabase
      .from("clip_renders")
      .select(columns.join(", "))
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(2000);

  // Unlike Library, no 40-row cap: a total that silently stops counting at 40
  // is worse than no total.
  let { data, error } = await read([...COLUMNS, "genre"]);
  if (error && /genre/.test(error.message)) {
    // 009 not applied yet. Everything but the genre charts still works.
    ({ data, error } = await read(COLUMNS));
  }
  const rows = ((error ? [] : data) ?? []) as unknown as Row[];

  const reels: ReelRecord[] = rows.map((row) => {
    const segments = Array.isArray(row.segments) ? row.segments : [];
    // Older rows predate the worker measuring its output. The spans it was cut
    // from are the next best thing, and they are exact for stitched clips.
    const measured = row.duration_s == null ? null : Number(row.duration_s);
    const spanned = segments.reduce(
      (sum, s) => sum + Math.max(0, Number(s.end ?? 0) - Number(s.start ?? 0)),
      0,
    );
    return {
      id: row.id,
      videoId: row.video_id,
      status: row.status,
      createdAt: row.created_at,
      finishedAt: row.finished_at,
      durationS: measured ?? (spanned > 0 ? spanned : null),
      gameplay: row.gameplay,
      captionPreset: row.caption_preset,
      asrSource: row.asr_source,
      genre: asGenre(row.genre) ?? null,
      topic: row.topic,
      hook: row.hook,
      score: typeof row.score === "number" ? row.score : null,
      scores: row.scores && typeof row.scores === "object" ? row.scores : null,
      roles: segments
        .map((s) => s.role)
        .filter((r): r is ReelRecord["roles"][number] =>
          r === "setup" || r === "beat" || r === "turn" || r === "payoff",
        ),
    };
  });

  const videoIds = [...new Set(reels.map((r) => r.videoId))];
  const videos: Record<string, SourceVideo> = {};
  if (videoIds.length) {
    const { data: vids } = await supabase
      .from("video_cache")
      .select("video_id, title, channel, duration_s, thumbnail_url")
      .in("video_id", videoIds);
    for (const v of (vids ?? []) as {
      video_id: string;
      title: string;
      channel: string;
      duration_s: number;
      thumbnail_url: string;
    }[]) {
      videos[v.video_id] = {
        title: v.title,
        channel: v.channel,
        durationS: v.duration_s ?? 0,
        thumbnailUrl: v.thumbnail_url ?? "",
      };
    }
  }

  const best = rows
    .filter((r) => r.status === "ready" && r.output_path && typeof r.score === "number")
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, POSTERS);
  const posters: Record<string, string> = {};
  await Promise.all(
    best.map(async (row) => {
      const url = await signedClipUrl(
        row.output_path!.replace(/\.mp4$/, ".jpg"),
        (row.storage as StorageProvider) ?? "supabase",
      ).catch(() => null);
      if (url) posters[row.id] = url;
    }),
  );

  const unsorted = "genre" in (rows[0] ?? {})
    ? reels.filter((r) => r.status !== "failed" && !r.genre).length
    : 0;

  return { reels, videos, posters, unsorted };
}
