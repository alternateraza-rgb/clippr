/**
 * The clips shown on the marketing site. Web-sized derivatives of the source
 * files (the originals in public/clips are 1080p and ~23MB together, which is
 * why the hero used to sit on a blank box until they finished arriving).
 * Every entry has a poster, and the poster is what renders first — the video is
 * an upgrade on top of an image that is already correct.
 */
export type ShowcaseClip = {
  src: string;
  poster: string;
  label: string;
  caption: string;
  views: string;
};

export const SHOWCASE: ShowcaseClip[] = [
  {
    src: "/showcase/clip-2.mp4",
    poster: "/showcase/clip-2.jpg",
    label: "Interview",
    caption: "The best advice she ever got",
    views: "412K",
  },
  {
    src: "/showcase/clip-1.mp4",
    poster: "/showcase/clip-1.jpg",
    label: "Podcast",
    caption: "He did not see that coming",
    views: "1.2M",
  },
  {
    src: "/showcase/clip-3.mp4",
    poster: "/showcase/clip-3.jpg",
    label: "Vlog",
    caption: "A day that actually pays",
    views: "308K",
  },
];
