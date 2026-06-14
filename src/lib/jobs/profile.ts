import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { UserProfile } from "@/lib/jobs/scoring/types";
import { DEFAULT_FETCH_SETTINGS } from "./fetch-settings";

interface ProfileRow {
  id: string;
  skills: string[];
  target_titles: string[];
  preferred_locations: string[];
  visa_required: boolean;
  seniority: string | null;
  min_salary: number | null;
  resume_text: string | null;
  match_threshold: number;
  enabled_sources?: string[];
  search_keywords?: string[];
  search_location?: string;
  max_results_per_source?: number;
  lookback_hours?: number;
  job_filter_keywords?: string[];
  dedupe_days?: number;
}

const DEFAULT_PROFILE_INSERT = {
  skills: ["TypeScript", "JavaScript", "React", "Node.js", "Python", "PostgreSQL", "AWS"],
  target_titles: [
    "Software Engineer",
    "Backend Developer",
    "Full Stack Developer",
    "Frontend Developer",
  ],
  preferred_locations: ["Berlin", "Munich", "Remote", "Hamburg", "Frankfurt"],
  visa_required: true,
  seniority: "mid",
  resume_text: "Experienced software engineer with expertise in full-stack web development.",
  match_threshold: 70,
  enabled_sources: DEFAULT_FETCH_SETTINGS.enabledSources,
  search_keywords: DEFAULT_FETCH_SETTINGS.searchKeywords,
  search_location: DEFAULT_FETCH_SETTINGS.searchLocation,
  max_results_per_source: DEFAULT_FETCH_SETTINGS.maxResults,
  lookback_hours: DEFAULT_FETCH_SETTINGS.lookbackHours,
  job_filter_keywords: [],
  dedupe_days: DEFAULT_FETCH_SETTINGS.dedupeDays,
};

export function mapProfileRow(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    skills: row.skills ?? [],
    targetTitles: row.target_titles ?? [],
    preferredLocations: row.preferred_locations ?? [],
    visaRequired: row.visa_required,
    seniority: row.seniority,
    minSalary: row.min_salary,
    resumeText: row.resume_text,
    matchThreshold: row.match_threshold ?? 70,
    enabledSources: row.enabled_sources ?? DEFAULT_FETCH_SETTINGS.enabledSources,
    searchKeywords: row.search_keywords ?? DEFAULT_FETCH_SETTINGS.searchKeywords,
    searchLocation: row.search_location ?? DEFAULT_FETCH_SETTINGS.searchLocation,
    maxResultsPerSource:
      row.max_results_per_source ?? DEFAULT_FETCH_SETTINGS.maxResults,
    lookbackHours: row.lookback_hours ?? DEFAULT_FETCH_SETTINGS.lookbackHours,
    jobFilterKeywords: row.job_filter_keywords ?? [],
    dedupeDays: row.dedupe_days ?? DEFAULT_FETCH_SETTINGS.dedupeDays,
  };
}

async function createDefaultProfile(): Promise<UserProfile | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("user_profile")
    .insert(DEFAULT_PROFILE_INSERT)
    .select()
    .single();

  if (error || !data) {
    console.error("Failed to create default profile:", error?.message);
    return null;
  }
  return mapProfileRow(data as ProfileRow);
}

export async function getUserProfile(): Promise<UserProfile | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("user_profile")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to load profile:", error.message);
    return null;
  }

  if (!data) {
    return createDefaultProfile();
  }

  return mapProfileRow(data as ProfileRow);
}

export async function updateUserProfile(
  updates: Partial<{
    skills: string[];
    target_titles: string[];
    preferred_locations: string[];
    visa_required: boolean;
    seniority: string;
    min_salary: number;
    resume_text: string;
    match_threshold: number;
    enabled_sources: string[];
    search_keywords: string[];
    search_location: string;
    max_results_per_source: number;
    lookback_hours: number;
    job_filter_keywords: string[];
    dedupe_days: number;
  }>
): Promise<UserProfile | null> {
  const supabase = getSupabaseAdmin();
  const existing = await getUserProfile();

  if (!existing) {
    const { data, error } = await supabase
      .from("user_profile")
      .insert({ ...DEFAULT_PROFILE_INSERT, ...updates })
      .select()
      .single();
    if (error || !data) return null;
    return mapProfileRow(data as ProfileRow);
  }

  const { data, error } = await supabase
    .from("user_profile")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", existing.id)
    .select()
    .single();

  if (error || !data) return null;
  return mapProfileRow(data as ProfileRow);
}
