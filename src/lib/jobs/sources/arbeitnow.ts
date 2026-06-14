import { RawJob, SourceFetchResult, matchesJobFilter, isWithinLookback } from "./types";
import { FetchSettings } from "../fetch-settings";

const ARBEITNOW_API = "https://www.arbeitnow.com/api/job-board-api";

interface ArbeitnowJob {
  slug: string;
  title: string;
  company_name: string;
  location: string;
  remote: boolean;
  visa_sponsorship: boolean;
  created_at: number;
  url: string;
  description: string;
  tags: string[];
}

export async function fetchArbeitnowJobs(
  settings: FetchSettings,
  cursor?: Record<string, unknown>
): Promise<SourceFetchResult> {
  try {
    const startPage = (cursor?.page as number) ?? 1;
    const collected: RawJob[] = [];
    let lastPage = startPage;

    for (let page = startPage; page < startPage + 5 && collected.length < settings.maxResults; page++) {
      const url = `${ARBEITNOW_API}?page=${page}`;
      const res = await fetch(url, { next: { revalidate: 0 } });

      if (!res.ok) {
        if (collected.length > 0) break;
        return { jobs: [], status: "error", error: `Arbeitnow API ${res.status}` };
      }

      const data = await res.json();
      const items: ArbeitnowJob[] = data.data ?? [];
      if (items.length === 0) break;

      for (const item of items) {
        const postedAt = new Date(item.created_at * 1000).toISOString();
        if (
          !isWithinLookback(postedAt, settings.lookbackHours) ||
          !matchesJobFilter(item.title, item.description, item.tags, settings.jobFilterKeywords)
        ) {
          continue;
        }

        collected.push({
          sourceId: "arbeitnow",
          sourceJobId: item.slug,
          title: item.title,
          company: item.company_name,
          location: item.location || null,
          remote: item.remote ? "remote" : "onsite",
          visaSponsorship: item.visa_sponsorship ? "yes" : "no",
          postedAt,
          applyUrl: item.url,
          description: item.description,
          tags: item.tags,
        });

        if (collected.length >= settings.maxResults) break;
      }

      lastPage = page;
      if (!data.links?.next) break;
    }

    const hasMore = lastPage < startPage + 4;
    return {
      jobs: collected,
      cursor: hasMore ? { page: lastPage + 1 } : undefined,
      status: "success",
    };
  } catch (err) {
    return {
      jobs: [],
      status: "error",
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
