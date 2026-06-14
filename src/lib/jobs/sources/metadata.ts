export interface SourceMeta {
  id: string;
  name: string;
  phase: 1 | 2;
  cost: string;
  requiresApify: boolean;
  description: string;
}

export const SOURCE_METADATA: SourceMeta[] = [
  {
    id: "arbeitnow",
    name: "Arbeitnow",
    phase: 1,
    cost: "Free",
    requiresApify: false,
    description: "Free JSON API with visa sponsorship filter",
  },
  {
    id: "arbeitsagentur",
    name: "Arbeitsagentur",
    phase: 1,
    cost: "Free",
    requiresApify: false,
    description: "Bundesagentur für Arbeit — largest German job DB",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    phase: 1,
    cost: "~$0.5–1 / 1k",
    requiresApify: true,
    description: "Guest API via Apify actor",
  },
  {
    id: "stepstone",
    name: "StepStone",
    phase: 1,
    cost: "~$1 / 1k",
    requiresApify: true,
    description: "Structured German listings via Apify",
  },
  {
    id: "germantechjobs",
    name: "GermanTechJobs",
    phase: 1,
    cost: "Low",
    requiresApify: true,
    description: "Niche German tech jobs with salary ranges",
  },
  {
    id: "wellfound",
    name: "Wellfound",
    phase: 1,
    cost: "Low",
    requiresApify: true,
    description: "Startup/remote roles, filtered to Germany",
  },
  {
    id: "indeed",
    name: "Indeed Germany",
    phase: 2,
    cost: "~$3 / 1k",
    requiresApify: true,
    description: "Broad coverage; higher cost, more anti-bot risk",
  },
  {
    id: "xing",
    name: "XING Jobs",
    phase: 2,
    cost: "Higher",
    requiresApify: true,
    description: "DACH-focused; may need residential proxies",
  },
];
