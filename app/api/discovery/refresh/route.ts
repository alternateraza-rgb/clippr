import { NICHES } from "@/lib/fixtures/niches";
import { refreshDiscovery } from "@/lib/discovery";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST() {
  const niches = NICHES.map((n) => n.id);
  const result = await refreshDiscovery(niches);
  return Response.json(result);
}

export async function GET() {
  const niches = NICHES.map((n) => n.id);
  const result = await refreshDiscovery(niches);
  return Response.json(result);
}
