import { fetchArbeitnowJobs } from "./arbeitnow";
import { fetchArbeitsagenturJobs } from "./arbeitsagentur";
import {
  fetchLinkedInJobs,
  fetchStepStoneJobs,
  fetchGermanTechJobs,
  fetchWellfoundJobs,
  fetchIndeedJobs,
  fetchXingJobs,
} from "../apify-client";
import { SourceFetchResult } from "./types";
import { FetchSettings, SourceId } from "../fetch-settings";

export type { SourceId };

export interface SourceFetcher {
  id: SourceId;
  name: string;
  phase: 1 | 2;
  requiresApify?: boolean;
  fetch: (
    settings: FetchSettings,
    cursor?: Record<string, unknown>
  ) => Promise<SourceFetchResult>;
}

export const SOURCES: SourceFetcher[] = [
  { id: "arbeitnow", name: "Arbeitnow", phase: 1, fetch: fetchArbeitnowJobs },
  {
    id: "arbeitsagentur",
    name: "Arbeitsagentur",
    phase: 1,
    fetch: fetchArbeitsagenturJobs,
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    phase: 1,
    fetch: fetchLinkedInJobs,
    requiresApify: true,
  },
  {
    id: "stepstone",
    name: "StepStone",
    phase: 1,
    fetch: fetchStepStoneJobs,
    requiresApify: true,
  },
  {
    id: "germantechjobs",
    name: "GermanTechJobs",
    phase: 1,
    fetch: fetchGermanTechJobs,
    requiresApify: true,
  },
  {
    id: "wellfound",
    name: "Wellfound",
    phase: 1,
    fetch: fetchWellfoundJobs,
    requiresApify: true,
  },
  {
    id: "indeed",
    name: "Indeed Germany",
    phase: 2,
    fetch: fetchIndeedJobs,
    requiresApify: true,
  },
  {
    id: "xing",
    name: "XING Jobs",
    phase: 2,
    fetch: fetchXingJobs,
    requiresApify: true,
  },
];

export function getSourceById(id: string): SourceFetcher | undefined {
  return SOURCES.find((s) => s.id === id);
}

export function getEnabledSources(enabledIds: string[]): SourceFetcher[] {
  const set = new Set(enabledIds);
  return SOURCES.filter((s) => set.has(s.id));
}
