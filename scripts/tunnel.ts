import "../lib/load-env";
import ngrok from "@ngrok/ngrok";

/**
 * Public URL for the worker running on this machine.
 *
 * Uses ngrok's native Node module rather than the CLI: the npm-distributed
 * ngrok binary is unsigned, and macOS SIGKILLs it on launch.
 *
 * NGROK_DOMAIN is what makes this survivable unattended. Without it every
 * restart mints a new URL, which means editing CLIP_WORKER_URL on Vercel and
 * redeploying before clips work again. Claim the free static domain once at
 * https://dashboard.ngrok.com/domains and the URL never changes.
 */
async function main() {
  const port = Number(process.env.PORT || 8787);
  const authtoken = process.env.NGROK_AUTHTOKEN;
  const domain = process.env.NGROK_DOMAIN;

  if (!authtoken) {
    console.error("[tunnel] NGROK_AUTHTOKEN missing — add it to .env.local");
    process.exit(1);
  }
  if (!domain) {
    console.warn("[tunnel] No NGROK_DOMAIN set. This URL dies on restart; claim a free static domain.");
  }

  const listener = await ngrok.forward({
    addr: port,
    authtoken,
    ...(domain ? { domain } : {}),
  });

  console.info(`[tunnel] ${listener.url()} -> http://127.0.0.1:${port}`);
  console.info("[tunnel] set CLIP_WORKER_URL on Vercel to that URL (no trailing slash)");

  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.on(signal, () => {
      console.info(`[tunnel] ${signal} — closing`);
      void listener.close().finally(() => process.exit(0));
    });
  }

  // An ngrok session can drop while this process stays perfectly alive, which
  // means launchd's KeepAlive never fires and the worker is quietly
  // unreachable — the site keeps queueing jobs nothing will ever pick up.
  // Prove the round trip through the public URL instead of trusting the SDK,
  // and exit so the service supervisor restarts us.
  const publicUrl = listener.url();
  let misses = 0;
  setInterval(async () => {
    if (!publicUrl) return;
    try {
      const res = await fetch(`${publicUrl}/health`, { signal: AbortSignal.timeout(15_000) });
      if (!res.ok) throw new Error(`health ${res.status}`);
      misses = 0;
    } catch (error) {
      misses += 1;
      console.warn(
        `[tunnel] unreachable (${misses}/3): ${error instanceof Error ? error.message : error}`,
      );
      if (misses >= 3) {
        console.error("[tunnel] session is dead — exiting so the service restarts");
        process.exit(1);
      }
    }
  }, 60_000);
}

main().catch((error) => {
  console.error("[tunnel] failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
