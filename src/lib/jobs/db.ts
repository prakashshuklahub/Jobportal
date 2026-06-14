import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { NormalizedJob, JobRow } from "./sources/types";
import { ScoreBreakdown } from "./scoring/types";

interface JobDbRow {
  id: string;
  source: string;
  source_job_id: string;
  title: string;
  company: string;
  location: string | null;
  remote_type: string;
  salary_min: number | null;
  salary_max: number | null;
  currency: string | null;
  visa_sponsorship: string;
  posted_at: string;
  apply_url: string;
  description: string | null;
  tags: string[] | null;
  dedupe_hash: string;
  fetched_at: string;
  match_score: number | null;
  match_breakdown: ScoreBreakdown | null;
  created_at: string;
}

export function mapJobRow(row: JobDbRow): JobRow {
  return {
    id: row.id,
    source: row.source,
    sourceJobId: row.source_job_id,
    title: row.title,
    company: row.company,
    location: row.location,
    remoteType: row.remote_type as JobRow["remoteType"],
    salaryMin: row.salary_min,
    salaryMax: row.salary_max,
    currency: row.currency,
    visaSponsorship: row.visa_sponsorship as JobRow["visaSponsorship"],
    postedAt: row.posted_at,
    applyUrl: row.apply_url,
    description: row.description ?? "",
    tags: row.tags ?? [],
    dedupeHash: row.dedupe_hash,
    fetchedAt: row.fetched_at,
    matchScore: row.match_score,
    matchBreakdown: row.match_breakdown,
    createdAt: row.created_at,
  };
}

export async function getExistingDedupeHashes(
  dedupeDays = 7
): Promise<Set<string>> {
  const supabase = getSupabaseAdmin();
  const cutoff = new Date(
    Date.now() - dedupeDays * 24 * 60 * 60 * 1000
  ).toISOString();
  const { data } = await supabase
    .from("jobs")
    .select("dedupe_hash")
    .gte("posted_at", cutoff);

  return new Set((data ?? []).map((r) => r.dedupe_hash));
}

export async function insertJob(
  job: NormalizedJob,
  matchScore: number,
  matchBreakdown: ScoreBreakdown
): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("jobs").insert({
    source: job.source,
    source_job_id: job.sourceJobId,
    title: job.title,
    company: job.company,
    location: job.location,
    remote_type: job.remoteType,
    salary_min: job.salaryMin,
    salary_max: job.salaryMax,
    currency: job.currency,
    visa_sponsorship: job.visaSponsorship,
    posted_at: job.postedAt,
    apply_url: job.applyUrl,
    description: job.description,
    tags: job.tags,
    dedupe_hash: job.dedupeHash,
    match_score: matchScore,
    match_breakdown: matchBreakdown,
  });

  return !error;
}

export async function listJobs(minScore = 0): Promise<JobRow[]> {
  const supabase = getSupabaseAdmin();
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .gte("match_score", minScore)
    .gte("posted_at", cutoff)
    .order("match_score", { ascending: false })
    .order("posted_at", { ascending: false });

  if (error || !data) return [];
  return (data as JobDbRow[]).map(mapJobRow);
}

export async function getJobById(id: string): Promise<JobRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return mapJobRow(data as JobDbRow);
}

export async function updateSourceFetchState(
  source: string,
  status: string,
  cursor?: Record<string, unknown>,
  error?: string
): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase.from("source_fetch_state").upsert({
    source,
    last_run_at: new Date().toISOString(),
    cursor: cursor ?? null,
    last_status: status,
    last_error: error ?? null,
  });
}

export async function getSourceFetchState(
  source: string
): Promise<Record<string, unknown> | undefined> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("source_fetch_state")
    .select("cursor")
    .eq("source", source)
    .single();

  return (data?.cursor as Record<string, unknown>) ?? undefined;
}
