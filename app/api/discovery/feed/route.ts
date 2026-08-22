import { readDiscovery } from "@/lib/discovery";
import type { Niche } from "@/lib/agent/types";

export async function GET(request: Request) {
  const niche = new URL(request.url).searchParams.get("niche") as Niche | null;
  const items = await readDiscovery(niche || undefined);
  return Response.json({ items });
}
