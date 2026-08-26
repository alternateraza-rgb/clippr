import { AuthShell } from "@/components/auth/AuthShell";
import { Skeleton } from "@/components/ui/Skeleton";

/** Same frame, same field rhythm — only the values are still on the wire. */
export function AuthCardSkeleton({
  title,
  subtitle,
  fields,
}: {
  title: string;
  subtitle: string;
  fields: number;
}) {
  return (
    <AuthShell title={title} subtitle={subtitle}>
      <div className="mt-8 space-y-2.5">
        {Array.from({ length: fields }, (_, i) => (
          <Skeleton key={i} className="h-[52px] rounded-full" />
        ))}
        <Skeleton className="mt-5 h-[52px] rounded-full" />
      </div>
    </AuthShell>
  );
}
