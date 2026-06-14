import { UserProfile } from "./scoring/types";

export interface FetchSettings {
  enabledSources: string[];
  searchKeywords: string[];
  searchLocation: string;
  maxResults: number;
  lookbackHours: number;
  jobFilterKeywords: string[];
  dedupeDays: number;
}

export const ALL_SOURCE_IDS = [
  "arbeitnow",
  "arbeitsagentur",
  "linkedin",
  "stepstone",
  "germantechjobs",
  "wellfound",
  "indeed",
  "xing",
] as const;

export type SourceId = (typeof ALL_SOURCE_IDS)[number];

export const DEFAULT_FETCH_SETTINGS: FetchSettings = {
  enabledSources: [...ALL_SOURCE_IDS],
  searchKeywords: ["software engineer", "software entwickler"],
  searchLocation: "Germany",
  maxResults: 50,
  lookbackHours: 24,
  jobFilterKeywords: [],
  dedupeDays: 7,
};

export function fetchSettingsFromProfile(profile: UserProfile): FetchSettings {
  return {
    enabledSources:
      profile.enabledSources.length > 0
        ? profile.enabledSources
        : DEFAULT_FETCH_SETTINGS.enabledSources,
    searchKeywords:
      profile.searchKeywords.length > 0
        ? profile.searchKeywords
        : DEFAULT_FETCH_SETTINGS.searchKeywords,
    searchLocation: profile.searchLocation || DEFAULT_FETCH_SETTINGS.searchLocation,
    maxResults: profile.maxResultsPerSource || DEFAULT_FETCH_SETTINGS.maxResults,
    lookbackHours: profile.lookbackHours || DEFAULT_FETCH_SETTINGS.lookbackHours,
    jobFilterKeywords: profile.jobFilterKeywords ?? [],
    dedupeDays: profile.dedupeDays || DEFAULT_FETCH_SETTINGS.dedupeDays,
  };
}

export function primaryKeyword(settings: FetchSettings): string {
  return settings.searchKeywords[0] ?? "software engineer";
}

export function lookbackDays(settings: FetchSettings): number {
  return Math.max(1, Math.ceil(settings.lookbackHours / 24));
}
