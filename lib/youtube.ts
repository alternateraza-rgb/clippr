const WATCH = /(?:youtube\.com\/watch\?.*?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/;
const BARE_ID = /^[A-Za-z0-9_-]{11}$/;

export function parseYouTubeId(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (BARE_ID.test(trimmed)) return trimmed;
  const match = trimmed.match(WATCH);
  return match?.[1] ?? null;
}

export function isYouTubeUrl(input: string) {
  return Boolean(parseYouTubeId(input));
}

export function thumbnailFor(videoId: string) {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}
