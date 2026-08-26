import { Skeleton } from "@/components/ui/Skeleton";

/**
 * The sidebar comes from the layout, so this only stands in for the page body.
 * Its presence is what lets the workspace commit the moment you click, instead
 * of leaving you on the previous page while the proxy checks your session.
 */
export default function AppLoading() {
  return (
    <div className="space-y-10">
      <div>
        <Skeleton className="h-3 w-24 rounded-full" />
        <Skeleton className="mt-4 h-10 w-[min(420px,70%)] rounded-full" />
        <Skeleton className="mt-4 h-4 w-[min(520px,85%)] rounded-full" />
      </div>
      <Skeleton className="h-[52px] rounded-full" />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="aspect-[16/10]" />
        ))}
      </div>
    </div>
  );
}
