import type { Niche, NicheMeta } from "@/lib/agent/types";

export const NICHES: NicheMeta[] = [
  {
    id: "finance",
    label: "Finance",
    blurb: "Money advice that actually clips — hooks, contrarian takes, payoff.",
    opportunity: 92,
    competition: 78,
    evergreen: 88,
    monetization: 94,
  },
  {
    id: "true-crime",
    label: "True crime",
    blurb: "Story beats with built-in cliffhangers. Shorts eat this alive.",
    opportunity: 86,
    competition: 71,
    evergreen: 80,
    monetization: 74,
  },
  {
    id: "podcasts",
    label: "Podcasts",
    blurb: "Long conversations hide 20-second gold. Highest clip density.",
    opportunity: 90,
    competition: 64,
    evergreen: 84,
    monetization: 81,
  },
  {
    id: "sports",
    label: "Sports",
    blurb: "Reactions and highlights. Fast half-life, huge volume.",
    opportunity: 77,
    competition: 82,
    evergreen: 42,
    monetization: 70,
  },
  {
    id: "fitness",
    label: "Fitness",
    blurb: "Before/after energy and one-rule advice. Reliable saves.",
    opportunity: 81,
    competition: 76,
    evergreen: 90,
    monetization: 83,
  },
  {
    id: "faith",
    label: "Faith",
    blurb: "Sermon cuts and testimony. Quiet niche, loyal watch time.",
    opportunity: 73,
    competition: 38,
    evergreen: 93,
    monetization: 68,
  },
  {
    id: "comedy",
    label: "Comedy",
    blurb: "Punchlines travel. Timing is everything — we cut to the laugh.",
    opportunity: 84,
    competition: 88,
    evergreen: 61,
    monetization: 72,
  },
  {
    id: "tech",
    label: "Tech",
    blurb: "Demos, takes, and “this changes everything” moments.",
    opportunity: 79,
    competition: 80,
    evergreen: 55,
    monetization: 86,
  },
  {
    id: "politics",
    label: "Politics",
    blurb: "Heated exchanges clip well. High velocity, high risk.",
    opportunity: 75,
    competition: 85,
    evergreen: 28,
    monetization: 60,
  },
  {
    id: "storytime",
    label: "Storytime",
    blurb: "First-person stories with a twist. Native to Shorts.",
    opportunity: 83,
    competition: 69,
    evergreen: 76,
    monetization: 71,
  },
  {
    id: "self-improvement",
    label: "Self-improvement",
    blurb: "One hard truth per clip. The Hormozi machine.",
    opportunity: 88,
    competition: 83,
    evergreen: 91,
    monetization: 87,
  },
  {
    id: "gaming",
    label: "Gaming",
    blurb: "Commentary over gameplay — you already have the bottom half.",
    opportunity: 80,
    competition: 90,
    evergreen: 67,
    monetization: 75,
  },
];

export const FORMATS = [
  { id: "storytelling", label: "Storytelling" },
  { id: "debate", label: "Debate" },
  { id: "highlights", label: "Highlights" },
  { id: "commentary", label: "Commentary" },
  { id: "reaction", label: "Reaction" },
] as const;

export function nicheById(id: Niche) {
  return NICHES.find((n) => n.id === id) ?? NICHES[0];
}

export function pickForMe() {
  const ranked = [...NICHES].sort((a, b) => {
    const score = (n: NicheMeta) =>
      n.opportunity * 0.35 +
      (100 - n.competition) * 0.2 +
      n.evergreen * 0.2 +
      n.monetization * 0.25;
    return score(b) - score(a);
  });
  return { primary: ranked[0], runnerUp: ranked[1] };
}
