import type { Profile } from "@/lib/agent/types";

/**
 * What the client assumes before the server has told it anything.
 *
 * Every field here is a neutral starting point, not a persona. This used to
 * carry a demo identity — a name, a niche, onboarding already marked complete
 * — which leaked two ways: the greeting said "Good afternoon, Maya" until the
 * real profile loaded, and the signup form pre-filled that name into the box,
 * so anyone who did not clear it created an account under it.
 */
export const DEFAULT_PROFILE: Profile = {
  displayName: "",
  platforms: ["youtube"],
  niche: "finance",
  interests: [],
  nicheSource: "manual",
  captionPreset: "hormozi",
  defaultGameplay: "none",
  onboardingComplete: false,
};
