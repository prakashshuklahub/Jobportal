import type { ScoreBreakdown } from "../scoring/types";

export type RemoteType = "remote" | "hybrid" | "onsite" | "unknown";
export type VisaSponsorship = "yes" | "no" | "unknown";

export interface RawJob {
  sourceId: string;
  sourceJobId: string;
  title: string;
  company: string;
  location: string | null;
  remote: RemoteType;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  visaSponsorship: VisaSponsorship;
  postedAt: string;
  applyUrl: string;
  description: string;
  tags?: string[];
}

export interface NormalizedJob {
  source: string;
  sourceJobId: string;
  title: string;
  company: string;
  location: string | null;
  remoteType: RemoteType;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string | null;
  visaSponsorship: VisaSponsorship;
  postedAt: string;
  applyUrl: string;
  description: string;
  tags: string[];
  dedupeHash: string;
}

export interface JobRow extends NormalizedJob {
  id: string;
  fetchedAt: string;
  matchScore: number | null;
  matchBreakdown: ScoreBreakdown | null;
  createdAt: string;
}

export interface SourceFetchResult {
  jobs: RawJob[];
  cursor?: Record<string, unknown>;
  status: "success" | "partial" | "error";
  error?: string;
}

export const SOFTWARE_KEYWORDS = [
  "software",
  "developer",
  "engineer",
  "devops",
  "frontend",
  "backend",
  "full stack",
  "fullstack",
  "data engineer",
  "ml engineer",
  "machine learning",
  "cloud",
  "sre",
  "platform",
  "architect",
  "programmer",
  "entwickler",
  "softwareentwickler",
  "it",
  "tech",
  "typescript",
  "react",
  "node",
  "python",
  "java",
  "kotlin",
  "golang",
  "rust",
  "kubernetes",
  "aws",
  "azure",
];

export function matchesJobFilter(
  title: string,
  description: string,
  tags: string[] | undefined,
  customKeywords: string[]
): boolean {
  const keywords =
    customKeywords.length > 0 ? customKeywords : SOFTWARE_KEYWORDS;
  const text = `${title} ${description} ${(tags ?? []).join(" ")}`.toLowerCase();
  return keywords.some((kw) => text.includes(kw.toLowerCase()));
}

/** @deprecated use matchesJobFilter */
export function isSoftwareJob(title: string, description: string, tags?: string[]): boolean {
  return matchesJobFilter(title, description, tags, []);
}

export function isWithinLookback(postedAt: string, hours: number): boolean {
  const posted = new Date(postedAt);
  const cutoff = Date.now() - hours * 60 * 60 * 1000;
  return posted.getTime() >= cutoff;
}

export function isWithinLast24Hours(postedAt: string): boolean {
  return isWithinLookback(postedAt, 24);
}
