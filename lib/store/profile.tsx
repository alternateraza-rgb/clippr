"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import type { Profile } from "@/lib/agent/types";
import { DEFAULT_PROFILE } from "@/lib/fixtures/profile";

const KEY = "clipmuse.profile";
const listeners = new Set<() => void>();
let memory: Profile = DEFAULT_PROFILE;
let loaded = false;

function emit() {
  listeners.forEach((l) => l());
}

function readStorage(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Profile;
  } catch {
    // keep default
  }
  return DEFAULT_PROFILE;
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

function getServerSnapshot() {
  return DEFAULT_PROFILE;
}

type ProfileContextValue = {
  profile: Profile;
  hydrated: boolean;
  setProfile: (next: Profile | ((prev: Profile) => Profile)) => void;
  reset: () => void;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const profile = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setProfile = useCallback((next: Profile | ((prev: Profile) => Profile)) => {
    memory = typeof next === "function" ? next(memory) : next;
    try {
      localStorage.setItem(KEY, JSON.stringify(memory));
    } catch {
      // ignore quota
    }
    emit();
    fetch("/api/profile", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(memory),
    }).catch(() => null);
  }, []);

  const reset = useCallback(() => setProfile(DEFAULT_PROFILE), [setProfile]);

  const value = useMemo<ProfileContextValue>(
    () => ({
      profile,
      hydrated: true,
      setProfile,
      reset,
    }),
    [profile, setProfile, reset],
  );

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}
