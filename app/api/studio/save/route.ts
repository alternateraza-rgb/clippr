import { hasSupabase } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import type { ClipJob } from "@/lib/agent/types";

export async function POST(request: Request) {
  const job = (await request.json()) as ClipJob;
  if (!job?.id || !job.video || !job.candidate) {
    return Response.json({ message: "Invalid job" }, { status: 400 });
  }
  if (!hasSupabase()) {
    return Response.json({ ok: true, persisted: false });
  }
  const supabase = await createClient();
  if (!supabase) return Response.json({ ok: true, persisted: false });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ ok: true, persisted: false });

  const { error } = await supabase.from("clip_jobs").upsert({
    id: job.id,
    user_id: user.id,
    video_id: job.video.videoId,
    candidate: job.candidate,
    composition_spec: job.composition,
    status: job.status,
    video: job.video,
    created_at: job.createdAt,
  });
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json({ ok: true, persisted: true });
}

export async function GET() {
  if (!hasSupabase()) return Response.json({ jobs: [] });
  const supabase = await createClient();
  if (!supabase) return Response.json({ jobs: [] });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ jobs: [] });
  const { data } = await supabase
    .from("clip_jobs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  const jobs: ClipJob[] = (data ?? []).map((row) => ({
    id: row.id as string,
    video: row.video as ClipJob["video"],
    candidate: row.candidate as ClipJob["candidate"],
    composition: row.composition_spec as ClipJob["composition"],
    status: row.status as ClipJob["status"],
    createdAt: row.created_at as string,
  }));
  return Response.json({ jobs });
}
