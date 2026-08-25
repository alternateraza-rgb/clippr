import { spawn } from "node:child_process";

/** Grace period for stdio to flush after a process exits before we give up on it. */
const FLUSH_MS = 2000;

/**
 * `timeoutMs` is not optional thinking for anything touching the network: a peer
 * can accept a connection and then simply never send bytes, and without a kill
 * the render sits in "downloading" forever, holding the queue behind it.
 *
 * Two details make the kill actually work, both learned from a worker that hung
 * for twenty-six hours on a single stalled download:
 *
 * 1. **Kill the process group, not the child.** yt-dlp does its section
 *    downloads by spawning ffmpeg. SIGKILL to yt-dlp leaves that ffmpeg running
 *    as an orphan, still pulling the same byte range, forever.
 * 2. **Settle on `exit`, not only on `close`.** The orphaned grandchild inherits
 *    the pipes, so `close` — which waits for stdio to end — may never fire even
 *    though the child is long gone. That is what turned a stalled download into
 *    a permanently wedged worker rather than a failed render.
 */
export function run(cmd: string, args: string[], opts?: { cwd?: string; timeoutMs?: number }) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: opts?.cwd,
      stdio: ["ignore", "pipe", "pipe"],
      // Its own process group, so one signal can take the whole tree.
      detached: true,
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let settled = false;

    const stop = () => {
      try {
        // Negative pid = the whole group, which is where ffmpeg lives.
        if (child.pid) process.kill(-child.pid, "SIGKILL");
      } catch {
        child.kill("SIGKILL");
      }
    };

    const timer = opts?.timeoutMs
      ? setTimeout(() => {
          timedOut = true;
          stop();
        }, opts.timeoutMs)
      : null;

    const settle = (run: () => void) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      run();
    };

    const finish = (code: number | null) => {
      if (timedOut) {
        settle(() =>
          reject(new Error(`${cmd} timed out after ${Math.round((opts?.timeoutMs ?? 0) / 1000)}s`)),
        );
        return;
      }
      if (code === 0) settle(() => resolve({ stdout, stderr }));
      else settle(() => reject(new Error(stderr.trim() || stdout.trim() || `${cmd} exited ${code}`)));
    };

    child.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });

    child.on("error", (error) => settle(() => reject(error)));
    child.on("close", (code) => finish(code));
    child.on("exit", (code) => {
      // If a grandchild is holding the pipes open, `close` will not arrive.
      setTimeout(() => finish(code), FLUSH_MS).unref();
    });
  });
}
