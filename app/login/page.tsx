import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return (
    <AuthCard
      title="Welcome back."
      subtitle="Sign in to your clipping desk."
      action="Enter the studio"
      href="/app"
      initialError={params.error}
      footer={
        <>
          New here?{" "}
          <Link href="/signup" className="text-brand hover:underline">
            Create an account
          </Link>
        </>
      }
    />
  );
}
