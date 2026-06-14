import { RawJob, SourceFetchResult, isWithinLookback } from "./sources/types";
import { FetchSettings, primaryKeyword } from "./fetch-settings";

const APIFY_BASE = "https://api.apify.com/v2";

interface ApifyActorConfig {
  actorId: string;
  sourceId: string;
  buildInput: (settings: FetchSettings) => Record<string, unknown>;
  mapItem: (item: Record<string, unknown>) => RawJob | null;
}

async function runApifyActor(
  config: ApifyActorConfig,
  settings: FetchSettings
): Promise<SourceFetchResult> {
  const token = process.env.APIFY_TOKEN;
  if (!token) {
    return {
      jobs: [],
      status: "error",
      error: "APIFY_TOKEN not configured",
    };
  }

  try {
    const actorPath = config.actorId.replace("/", "~");
    const syncUrl = `${APIFY_BASE}/acts/${actorPath}/run-sync-get-dataset-items?token=${token}&timeout=60`;

    const res = await fetch(syncUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config.buildInput(settings)),
    });

    if (!res.ok) {
      return {
        jobs: [],
        status: "error",
        error: `Apify ${config.sourceId} ${res.status}`,
      };
    }

    const items: Record<string, unknown>[] = await res.json();
    const jobs: RawJob[] = [];

    for (const item of items) {
      const mapped = config.mapItem(item);
      if (mapped && isWithinLookback(mapped.postedAt, settings.lookbackHours)) {
        jobs.push(mapped);
      }
      if (jobs.length >= settings.maxResults) break;
    }

    return { jobs, status: "success" };
  } catch (err) {
    return {
      jobs: [],
      status: "error",
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

function parsePostedAt(value: unknown): string {
  if (!value) return new Date().toISOString();
  const d = new Date(String(value));
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function parseSalary(item: Record<string, unknown>): {
  min?: number;
  max?: number;
  currency?: string;
} {
  const min = item.salaryMin ?? item.salary_min ?? item.salary;
  const max = item.salaryMax ?? item.salary_max;
  const currency = (item.currency as string) ?? "EUR";
  return {
    min: min != null ? Number(min) : undefined,
    max: max != null ? Number(max) : undefined,
    currency,
  };
}

export async function fetchLinkedInJobs(
  settings: FetchSettings
): Promise<SourceFetchResult> {
  return runApifyActor(
    {
      actorId: "curious_coder/linkedin-jobs-scraper",
      sourceId: "linkedin",
      buildInput: (s) => ({
        keywords: primaryKeyword(s),
        location: s.searchLocation,
        maxResults: s.maxResults,
        datePosted: s.lookbackHours <= 24 ? "past 24 hours" : "past week",
      }),
      mapItem: (item) => ({
        sourceId: "linkedin",
        sourceJobId: String(item.jobId ?? item.id ?? item.link ?? Math.random()),
        title: String(item.title ?? item.jobTitle ?? ""),
        company: String(item.company ?? item.companyName ?? "Unknown"),
        location: item.location ? String(item.location) : null,
        remote: String(item.workplaceType ?? "").toLowerCase().includes("remote")
          ? "remote"
          : "unknown",
        ...parseSalary(item),
        visaSponsorship: "unknown",
        postedAt: parsePostedAt(item.postedAt ?? item.listedAt ?? item.date),
        applyUrl: String(item.link ?? item.url ?? item.applyUrl ?? "#"),
        description: String(item.description ?? item.title ?? ""),
        tags: [],
      }),
    },
    settings
  );
}

export async function fetchStepStoneJobs(
  settings: FetchSettings
): Promise<SourceFetchResult> {
  return runApifyActor(
    {
      actorId: "jupri/stepstone-scraper",
      sourceId: "stepstone",
      buildInput: (s) => ({
        keyword: primaryKeyword(s),
        location: s.searchLocation,
        maxItems: s.maxResults,
      }),
      mapItem: (item) => ({
        sourceId: "stepstone",
        sourceJobId: String(item.id ?? item.url ?? Math.random()),
        title: String(item.title ?? ""),
        company: String(item.company ?? "Unknown"),
        location: item.location ? String(item.location) : null,
        remote: "unknown",
        ...parseSalary(item),
        visaSponsorship: "unknown",
        postedAt: parsePostedAt(item.datePosted ?? item.postedAt),
        applyUrl: String(item.url ?? item.link ?? "#"),
        description: String(item.description ?? item.title ?? ""),
        tags: [],
      }),
    },
    settings
  );
}

export async function fetchGermanTechJobs(
  settings: FetchSettings
): Promise<SourceFetchResult> {
  return runApifyActor(
    {
      actorId: "unfenced-group/germantechjobs-scraper",
      sourceId: "germantechjobs",
      buildInput: (s) => ({
        maxResults: s.maxResults,
        keyword: primaryKeyword(s),
      }),
      mapItem: (item) => ({
        sourceId: "germantechjobs",
        sourceJobId: String(item.id ?? item.url ?? Math.random()),
        title: String(item.title ?? item.name ?? ""),
        company: String(item.company ?? "Unknown"),
        location: item.location ? String(item.location) : null,
        remote: item.remote ? "remote" : "unknown",
        salaryMin: item.salaryMin ? Number(item.salaryMin) : undefined,
        salaryMax: item.salaryMax ? Number(item.salaryMax) : undefined,
        currency: "EUR",
        visaSponsorship: "unknown",
        postedAt: parsePostedAt(item.postedAt ?? item.date),
        applyUrl: String(item.url ?? item.link ?? "#"),
        description: String(item.description ?? item.stack ?? item.title ?? ""),
        tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
      }),
    },
    settings
  );
}

export async function fetchWellfoundJobs(
  settings: FetchSettings
): Promise<SourceFetchResult> {
  return runApifyActor(
    {
      actorId: "gio21/wellfound-jobs-scraper",
      sourceId: "wellfound",
      buildInput: (s) => ({
        search: primaryKeyword(s),
        location: s.searchLocation,
        maxResults: s.maxResults,
      }),
      mapItem: (item) => {
        const location = item.location ? String(item.location) : null;
        const loc = location?.toLowerCase() ?? "";
        const isGermany =
          loc.includes("germany") ||
          loc.includes("berlin") ||
          loc.includes("munich") ||
          settings.searchLocation
            .toLowerCase()
            .split(",")
            .some((p) => loc.includes(p.trim().toLowerCase())) ||
          String(item.remote ?? "").toLowerCase() === "true";

        if (!isGermany) return null;

        return {
          sourceId: "wellfound",
          sourceJobId: String(item.id ?? item.url ?? Math.random()),
          title: String(item.title ?? ""),
          company: String(item.company ?? item.startup ?? "Unknown"),
          location,
          remote: item.remote ? "remote" : "unknown",
          ...parseSalary(item),
          visaSponsorship: "unknown",
          postedAt: parsePostedAt(item.postedAt ?? item.date),
          applyUrl: String(item.url ?? item.applyUrl ?? "#"),
          description: String(item.description ?? item.title ?? ""),
          tags: [],
        };
      },
    },
    settings
  );
}

export async function fetchIndeedJobs(
  settings: FetchSettings
): Promise<SourceFetchResult> {
  return runApifyActor(
    {
      actorId: "misceres/indeed-scraper",
      sourceId: "indeed",
      buildInput: (s) => ({
        position: primaryKeyword(s),
        country: "DE",
        location: s.searchLocation,
        maxItems: s.maxResults,
        parseCompanyDetails: false,
        fromDays: Math.max(1, Math.ceil(s.lookbackHours / 24)),
      }),
      mapItem: (item) => ({
        sourceId: "indeed",
        sourceJobId: String(item.id ?? item.jobKey ?? item.url ?? Math.random()),
        title: String(item.positionName ?? item.title ?? ""),
        company: String(item.company ?? item.companyName ?? "Unknown"),
        location: item.location ? String(item.location) : null,
        remote: String(item.jobType ?? item.remote ?? "")
          .toLowerCase()
          .includes("remote")
          ? "remote"
          : "unknown",
        ...parseSalary(item),
        visaSponsorship: "unknown",
        postedAt: parsePostedAt(item.postedAt ?? item.date ?? item.dateOnIndeed),
        applyUrl: String(item.url ?? item.link ?? item.externalApplyLink ?? "#"),
        description: String(item.description ?? item.snippet ?? item.title ?? ""),
        tags: [],
      }),
    },
    settings
  );
}

export async function fetchXingJobs(
  settings: FetchSettings
): Promise<SourceFetchResult> {
  return runApifyActor(
    {
      actorId: "ivanvs/xing-job-scraper",
      sourceId: "xing",
      buildInput: (s) => ({
        keywords: primaryKeyword(s),
        location: s.searchLocation,
        maxResults: s.maxResults,
      }),
      mapItem: (item) => ({
        sourceId: "xing",
        sourceJobId: String(item.id ?? item.url ?? Math.random()),
        title: String(item.title ?? item.name ?? ""),
        company: String(item.company ?? item.companyName ?? "Unknown"),
        location: item.location ? String(item.location) : null,
        remote: String(item.workplace ?? item.remote ?? "")
          .toLowerCase()
          .includes("remote")
          ? "remote"
          : "unknown",
        ...parseSalary(item),
        visaSponsorship: "unknown",
        postedAt: parsePostedAt(item.postedAt ?? item.date ?? item.publishedAt),
        applyUrl: String(item.url ?? item.link ?? "#"),
        description: String(item.description ?? item.title ?? ""),
        tags: [],
      }),
    },
    settings
  );
}
