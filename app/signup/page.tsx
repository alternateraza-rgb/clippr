import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";

export default function SignupPage() {
  return (
    <AuthCard
      title="Start clipping."
      subtitle="Create an account. We’ll ask about niche next."
      action="Continue"
      showName
      footer={
        <>
          Already clipping?{" "}
          <Link href="/login" className="text-brand hover:underline">
            Log in
          </Link>
        </>
      }
    />
  );
}
