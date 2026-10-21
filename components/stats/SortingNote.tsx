import { Loader2 } from "lucide-react";

/** Shown while older reels are being sorted into genres in the background. */
export function SortingNote({ sorting, unsorted }: { sorting: boolean; unsorted: number }) {
  if (!sorting) return null;
  return (
    <p className="flex items-center gap-2 text-sm text-muted">
      <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
      Sorting {unsorted} older reel{unsorted === 1 ? "" : "s"} into genres
    </p>
  );
}
