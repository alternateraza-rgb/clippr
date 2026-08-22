"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import type { ClipJob } from "@/lib/agent/types";

const KEY = "clipmuse.jobs";
const listeners = new Set<() => void>();
let memory: ClipJob[] = [];
let loaded = false;

function emit() {
  listeners.forEach((l) => l());
}

function readStorage(): ClipJob[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as ClipJob[];
  } catch {
    // keep empty
  }
  return [];
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  if (!loaded && typeof window !== "undefined") {
    memory = readStorage();
    loaded = true;
  }
  return memory;
}

function persist(next: ClipJob[]) {
  memory = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(memory));
  } catch {
    // ignore
  }
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
    persist([job, ...memory.filter((j) => j.id !== job.id)]);
  }, []);

  const replace = useCallback((next: ClipJob[]) => persist(next), []);

  const value = useMemo(() => ({ jobs, addJob, replace }), [jobs, addJob, replace]);
  return <JobsContext.Provider value={value}>{children}</JobsContext.Provider>;
}

export function useJobs() {
  const ctx = useContext(JobsContext);
  if (!ctx) throw new Error("useJobs must be used within JobsProvider");
  return ctx;
}
