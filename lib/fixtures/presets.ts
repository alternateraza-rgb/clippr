import type { CaptionPreset, GameplayTrack } from "@/lib/agent/types";

/**
 * Human labels for the two style choices. The stored ids stay as they are —
 * the renderer keys off them — but nobody signing in should be reading a
 * lowercase enum value off a settings page.
 */
export const CAPTION_PRESETS: {
  id: CaptionPreset;
  label: string;
  detail: string;
}[] = [
  {
    id: "hormozi",
    label: "Bold",
    detail: "Chunky words, key ones highlighted. What most big clip accounts use.",
  },
  {
    id: "clean",
    label: "Clean",
    detail: "White text with a hard outline. Reads over any footage.",
  },
  {
    id: "karaoke",
    label: "Karaoke",
    detail: "Words light up one at a time, on the beat of the audio.",
  },
];

export const GAMEPLAY_TRACKS: {
  id: GameplayTrack;
  label: string;
  detail: string;
}[] = [
  { id: "none", label: "None", detail: "The speaker fills the whole frame." },
  { id: "minecraft", label: "Minecraft", detail: "Parkour footage along the bottom." },
  { id: "gta", label: "Driving", detail: "Open-world driving along the bottom." },
  { id: "subway", label: "Endless runner", detail: "Subway-style footage along the bottom." },
];

export function captionPresetLabel(id: CaptionPreset) {
  return CAPTION_PRESETS.find((p) => p.id === id)?.label ?? "Bold";
}

export function gameplayLabel(id: GameplayTrack) {
  return GAMEPLAY_TRACKS.find((g) => g.id === id)?.label ?? "None";
}
