export interface UserProfile {
  id: string;
  skills: string[];
  targetTitles: string[];
  preferredLocations: string[];
  visaRequired: boolean;
  seniority: string | null;
  minSalary: number | null;
  resumeText: string | null;
  matchThreshold: number;
  enabledSources: string[];
  searchKeywords: string[];
  searchLocation: string;
  maxResultsPerSource: number;
  lookbackHours: number;
  jobFilterKeywords: string[];
  dedupeDays: number;
}

export interface ScoreBreakdown {
  skillsOverlap: number;
  titleSimilarity: number;
  location: number;
  visa: number;
  seniority: number;
}

export interface ScoreResult {
  score: number;
  breakdown: ScoreBreakdown;
}
