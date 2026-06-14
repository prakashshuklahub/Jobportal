import { RawJob, NormalizedJob } from "./types";
import { computeDedupeHash } from "../dedupe";

export function normalizeJob(raw: RawJob): NormalizedJob {
  const salaryMin = raw.salaryMin ?? null;
  const salaryMax = raw.salaryMax ?? null;
  const currency = raw.currency ?? (salaryMin || salaryMax ? "EUR" : null);

  return {
    source: raw.sourceId,
    sourceJobId: raw.sourceJobId,
    title: raw.title.trim(),
    company: raw.company.trim(),
    location: raw.location?.trim() ?? null,
    remoteType: raw.remote,
    salaryMin,
    salaryMax,
    currency,
    visaSponsorship: raw.visaSponsorship,
    postedAt: raw.postedAt,
    applyUrl: raw.applyUrl,
    description: raw.description,
    tags: raw.tags ?? [],
    dedupeHash: computeDedupeHash(raw.title, raw.company, raw.location),
  };
}

export function normalizeJobs(rawJobs: RawJob[]): NormalizedJob[] {
  return rawJobs.map(normalizeJob);
}
