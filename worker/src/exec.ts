import { spawn } from "node:child_process";

/**
 * `timeoutMs` is not optional thinking for anything touching the network: a
 * residential proxy peer can accept a connection and then simply never send
 * bytes, and without a kill the render sits in "downloading" forever, holding
 * the single-threaded queue behind it.
 */
export function run(cmd: string, args: string[], opts?: { cwd?: string; timeoutMs?: number }) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: opts?.cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = opts?.timeoutMs
      ? setTimeout(() => {
          timedOut = true;
          child.kill("SIGKILL");
        }, opts.timeoutMs)
      : null;
    child.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    child.on("error", (error) => {
      if (timer) clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      if (timer) clearTimeout(timer);
      if (timedOut) {
        reject(new Error(`${cmd} timed out after ${Math.round((opts?.timeoutMs ?? 0) / 1000)}s`));
        return;
      }
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(stderr.trim() || stdout.trim() || `${cmd} exited ${code}`));
    });
  });
}
