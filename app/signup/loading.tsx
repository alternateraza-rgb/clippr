import { AuthCardSkeleton } from "@/components/auth/AuthCardSkeleton";

export default function SignupLoading() {
  return (
    <AuthCardSkeleton
      title="Start clipping."
      subtitle="Create an account. We’ll ask about niche next."
      fields={3}
    />
  );
}
