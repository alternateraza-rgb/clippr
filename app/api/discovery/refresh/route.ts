import { NICHES } from "@/lib/fixtures/niches";
import { refreshDiscovery } from "@/lib/discovery";
import { isCronRequest } from "@/lib/auth/session";

export const runtime = "nodejs";
export const maxDuration = 60;

async function run(request: Request) {
  if (!isCronRequest(request)) {
    return Response.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }
  const niches = NICHES.map((n) => n.id);
  const result = await refreshDiscovery(niches);
  return Response.json(result);
}

export async function POST(request: Request) {
  return run(request);
}

export async function GET(request: Request) {
  return run(request);
}
