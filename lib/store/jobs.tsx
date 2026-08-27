"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import type { ClipJob } from "@/lib/agent/types";

/**
 * Jobs live in memory for the life of the tab and nowhere else.
 *
 * They used to be written to a browser-wide localStorage key, which is not
 * scoped to an account: signing in as someone else on the same machine showed
 * the previous person's work. clip_jobs on the server is already the source of
 * truth and is filtered by user_id, and SessionHydrator refetches it on every
 * load — so persisting locally bought a slightly faster first paint in
 * exchange for showing one customer another customer's clips.
 */
const listeners = new Set<() => void>();
let memory: ClipJob[] = [];

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  return memory;
}

/**
 * Nothing reads this any more, but it is one account's work sitting in a
 * browser other accounts sign into. Dropped on first load rather than left to
 * linger.
 */
if (typeof window !== "undefined") {
  try {
    window.localStorage.removeItem("clipmuse.jobs");
  } catch {
    // Private browsing throws on access; there is nothing to clean up there.
  }
}

function set(next: ClipJob[]) {
  memory = next;
  emit();
}

type JobsContextValue = {
  jobs: ClipJob[];
  addJob: (job: ClipJob) => void;
  replace: (jobs: ClipJob[]) => void;
};

const JobsContext = createContext<JobsContextValue | null>(null);

export function JobsProvider({ children }: { children: React.ReactNode }) {
  const jobs = useSyncExternalStore(subscribe, getSnapshot, () => memory);

  const addJob = useCallback((job: ClipJob) => {
    set([job, ...memory.filter((j) => j.id !== job.id)]);
  }, []);

  const replace = useCallback((next: ClipJob[]) => set(next), []);

  const value = useMemo(() => ({ jobs, addJob, replace }), [jobs, addJob, replace]);
  return <JobsContext.Provider value={value}>{children}</JobsContext.Provider>;
}

export function useJobs() {
  const ctx = useContext(JobsContext);
  if (!ctx) throw new Error("useJobs must be used within JobsProvider");
  return ctx;
}

/** Called when a load finds nobody signed in, so nothing outlives a session. */
export function clearJobs() {
  set([]);
}
