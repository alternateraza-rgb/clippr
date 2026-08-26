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

export function clipFilename(videoId: string, renderId: string) {
  return `clipmuse-${videoId || "clip"}-${renderId.slice(0, 8)}.mp4`;
}
