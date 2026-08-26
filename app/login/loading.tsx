import { AuthCardSkeleton } from "@/components/auth/AuthCardSkeleton";

export default function LoginLoading() {
  return (
    <AuthCardSkeleton
      title="Welcome back."
      subtitle="Sign in to your clipping desk."
      fields={2}
    />
  );
}
