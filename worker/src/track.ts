import { join } from "node:path";
import { env } from "../../lib/config";
import { run } from "./exec";

export type SpeakerTrack = {
  /** Horizontal centre of the speaker, 0..1 across the frame. */
  centerAt: (start: number, end: number) => number | null;
  samples: number;
};

type Sample = { t: number; x: number; w: number };

const SCRIPT = join(process.cwd(), "scripts", "vision", "track_speaker.py");

function pythonPath() {
  return env("VISION_PYTHON") || `${process.env.HOME}/.local/share/clipmuse-vision/bin/python`;
}

/**
 * Finds the speaker so the 9:16 crop can follow them.
 *
 * Optional by design: OpenCV lives in a venv on the machines that have one, and
 * everywhere else this returns an empty track and the caller centre-crops. A
 * missing interpreter is not a failed render.
 */
export async function trackSpeaker(video: string): Promise<SpeakerTrack> {
  let samples: Sample[] = [];
  try {
    const { stdout } = await run(pythonPath(), [SCRIPT, video, "--fps", "2"], {
      timeoutMs: 120_000,
    });
    const parsed = JSON.parse(stdout) as { track?: Sample[] };
    samples = (parsed.track ?? []).filter(
      (s) => Number.isFinite(s.t) && Number.isFinite(s.x) && s.x > 0 && s.x < 1,
    );
  } catch (error) {
    console.warn(
      `[track] no speaker tracking (${error instanceof Error ? error.message.slice(0, 90) : "unavailable"})`,
    );
    samples = [];
  }

  return {
    samples: samples.length,
    centerAt(start: number, end: number) {
      const inShot = samples.filter((s) => s.t >= start && s.t <= end);
      // Faces come and go — a shot with no detection borrows nothing and lets
      // the caller fall back rather than snapping to a stale position.
      if (!inShot.length) return null;
      // Median, not mean: one bad detection on a background face should not
      // drag the framing halfway across the room.
      const xs = inShot.map((s) => s.x).sort((a, b) => a - b);
      return xs[Math.floor(xs.length / 2)];
    },
  };
}
