import { getEnabledSources } from "./sources";
import { normalizeJobs } from "./sources/normalize";
import { scoreJob } from "./scoring/score-job";
import { getUserProfile } from "./profile";
import { getDatabaseSetupError } from "@/lib/supabase/setup";
import { fetchSettingsFromProfile } from "./fetch-settings";
import { isConfiguredEnv } from "@/lib/env";
import {
  getExistingDedupeHashes,
  insertJob,
  updateSourceFetchState,
  getSourceFetchState,
} from "./db";

const SOURCE_TIMEOUT_MS = 8000;

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string
): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}

export interface FetchPipelineResult {
  source: string;
  fetched: number;
  inserted: number;
  skipped: number;
  status: string;
  error?: string;
}

export async function runSourcePipeline(
  sourceId: string
): Promise<FetchPipelineResult> {
  const profile = await getUserProfile();
  if (!profile) {
    return {
      source: sourceId,
      fetched: 0,
      inserted: 0,
      skipped: 0,
      status: "error",
      error: "No user profile found",
    };
  }

  const settings = fetchSettingsFromProfile(profile);

  if (!settings.enabledSources.includes(sourceId)) {
    return {
      source: sourceId,
      fetched: 0,
      inserted: 0,
      skipped: 0,
      status: "skipped",
      error: "Source disabled in settings",
    };
  }

  const source = getEnabledSources(settings.enabledSources).find(
    (s) => s.id === sourceId
  );
  if (!source) {
    return {
      source: sourceId,
      fetched: 0,
      inserted: 0,
      skipped: 0,
      status: "error",
      error: "Unknown source",
    };
  }

  if (source.requiresApify && !isConfiguredEnv(process.env.APIFY_TOKEN)) {
    await updateSourceFetchState(sourceId, "skipped", undefined, "APIFY_TOKEN not set");
    return {
      source: sourceId,
      fetched: 0,
      inserted: 0,
      skipped: 0,
      status: "skipped",
      error: "APIFY_TOKEN not configured",
    };
  }

  const cursor = await getSourceFetchState(sourceId);
  let fetched = 0;
  let inserted = 0;
  let skipped = 0;

  try {
    const result = await withTimeout(
      source.fetch(settings, cursor),
      SOURCE_TIMEOUT_MS,
      sourceId
    );

    const normalized = normalizeJobs(result.jobs);
    fetched = normalized.length;

    const existingHashes = await getExistingDedupeHashes(settings.dedupeDays);

    for (const job of normalized) {
      if (existingHashes.has(job.dedupeHash)) {
        skipped++;
        continue;
      }

      const { score, breakdown } = scoreJob(job, profile);
      if (score < profile.matchThreshold) {
        skipped++;
        continue;
      }

      const ok = await insertJob(job, score, breakdown);
      if (ok) {
        inserted++;
        existingHashes.add(job.dedupeHash);
      } else {
        skipped++;
      }
    }

    await updateSourceFetchState(
      sourceId,
      result.status,
      result.cursor,
      result.error
    );

    return {
      source: sourceId,
      fetched,
      inserted,
      skipped,
      status: result.status,
      error: result.error,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await updateSourceFetchState(sourceId, "error", cursor, message);
    return {
      source: sourceId,
      fetched,
      inserted,
      skipped,
      status: "error",
      error: message,
    };
  }
}

export async function runAllSourcesPipeline(): Promise<FetchPipelineResult[]> {
  const dbError = await getDatabaseSetupError();
  if (dbError) {
    return [
      {
        source: "all",
        fetched: 0,
        inserted: 0,
        skipped: 0,
        status: "error",
        error: dbError,
      },
    ];
  }

  const profile = await getUserProfile();
  if (!profile) {
    return [
      {
        source: "all",
        fetched: 0,
        inserted: 0,
        skipped: 0,
        status: "error",
        error: "No user profile found",
      },
    ];
  }

  const settings = fetchSettingsFromProfile(profile);
  const sources = getEnabledSources(settings.enabledSources);
  const results: FetchPipelineResult[] = [];

  const freeSources = sources.filter((s) => !s.requiresApify);
  const apifySources = sources.filter((s) => s.requiresApify);

  const freeResults = await Promise.all(
    freeSources.map((s) => runSourcePipeline(s.id))
  );
  results.push(...freeResults);

  for (const source of apifySources) {
    const result = await runSourcePipeline(source.id);
    results.push(result);
  }

  return results;
}
