"use client";

import { useEffect } from "react";
import { useJobs } from "@/lib/store/jobs";
import { useProfile } from "@/lib/store/profile";
import type { ClipJob, Profile } from "@/lib/agent/types";

export function SessionHydrator() {
  const { setProfile } = useProfile();
  const { replace } = useJobs();

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d: { profile?: Profile | null }) => {
        if (d.profile) setProfile(d.profile);
      })
      .catch(() => null);
    fetch("/api/studio/save")
      .then((r) => r.json())
      .then((d: { jobs?: ClipJob[] }) => {
        if (d.jobs?.length) replace(d.jobs);
      })
      .catch(() => null);
  }, [replace, setProfile]);

  return null;
}
