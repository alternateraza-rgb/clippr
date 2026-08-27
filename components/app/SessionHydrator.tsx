"use client";

import { useEffect } from "react";
import { clearJobs, useJobs } from "@/lib/store/jobs";
import { useProfile } from "@/lib/store/profile";
import { DEFAULT_PROFILE } from "@/lib/fixtures/profile";
import type { ClipJob, Profile } from "@/lib/agent/types";

export function SessionHydrator() {
  const { hydrate } = useProfile();
  const { replace } = useJobs();

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d: { profile?: Profile | null; auth?: boolean }) => {
        if (d.profile) {
          hydrate(d.profile);
        } else if (d.auth === false) {
          // Nobody is signed in. Whatever this browser is still holding
          // belongs to whoever used it last.
          hydrate(DEFAULT_PROFILE);
          clearJobs();
        }
      })
      .catch(() => null);

    fetch("/api/studio/save")
      .then((r) => r.json())
      .then((d: { jobs?: ClipJob[] }) => {
        // Unconditionally. An empty list means "you have no jobs", not "keep
        // showing the ones already on screen" — which is how a new account
        // ended up looking at the previous account's work.
        replace(d.jobs ?? []);
      })
      .catch(() => null);
  }, [replace, hydrate]);

  return null;
}
