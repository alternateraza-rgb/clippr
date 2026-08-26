import { Skeleton } from "@/components/ui/Skeleton";

export default function OnboardingLoading() {
  return (
    <div className="mx-auto flex min-h-screen max-w-[560px] flex-col justify-center px-6 py-16">
      <Skeleton className="h-3 w-28 rounded-full" />
      <Skeleton className="mt-6 h-11 w-[min(380px,80%)] rounded-full" />
      <Skeleton className="mt-4 h-4 w-[min(460px,95%)] rounded-full" />
      <div className="mt-10 grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[72px]" />
        ))}
      </div>
    </div>
  );
}
