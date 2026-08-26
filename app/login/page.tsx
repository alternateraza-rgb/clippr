import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";

export default function LoginPage() {
  return (
    <AuthCard
      title="Welcome back."
      subtitle="Sign in to your clipping desk."
      action="Enter the studio"
      href="/app"
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
