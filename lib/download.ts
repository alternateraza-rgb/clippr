const DOWNLOADED_KEY = "clipmuse:downloaded";

/**
 * Save a file the browser fetched, without the two mistakes that make a
 * download silently do nothing:
 *
 * - the anchor must be in the document (Safari ignores clicks on detached ones)
 * - the object URL must outlive the click; revoking it synchronously cancels
 *   the download that was just started
 */
export async function downloadBlobUrl(url: string, filename: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 60_000);
}

/**
 * Which clips this browser has already pulled down. Kept locally rather than
 * on the render row: "did I get this file" is a fact about this machine, and
 * the same account on a second machine should still get its copy.
 */
function downloadedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(DOWNLOADED_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function hasDownloaded(renderId: string) {
  return downloadedIds().includes(renderId);
}

export function markDownloaded(renderId: string) {
  if (typeof window === "undefined") return;
  const ids = downloadedIds();
  if (ids.includes(renderId)) return;
  try {
    // Cap it: this is a dedupe guard, not history worth keeping forever.
    window.localStorage.setItem(DOWNLOADED_KEY, JSON.stringify([...ids, renderId].slice(-300)));
  } catch {
    // Private browsing and full quotas both throw. Worst case a clip
    // downloads twice, which is better than the write breaking the page.
  }
}

export function clipFilename(videoId: string, renderId: string) {
  return `clipmuse-${videoId || "clip"}-${renderId.slice(0, 8)}.mp4`;
}
