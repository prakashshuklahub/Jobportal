import { RawJob, SourceFetchResult, matchesJobFilter, isWithinLookback } from "./types";
import { FetchSettings, primaryKeyword, lookbackDays } from "../fetch-settings";

const API_BASE =
  "https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v6/jobs";
const API_KEY = "jobboerse-jobsuche";

interface ArbeitsagenturJobV6 {
  referenznummer: string;
  stellenangebotsTitel: string;
  firma: string;
  stellenlokationen?: Array<{ adresse?: { ort?: string } }>;
  aenderungsdatum?: string;
  datumErsteVeroeffentlichung?: string;
  externeURL?: string;
  homeofficemoeglich?: boolean;
  hauptberuf?: string;
  alleBerufe?: string[];
}

interface ArbeitsagenturResponseV6 {
  ergebnisliste?: ArbeitsagenturJobV6[];
}

function parsePostedAt(item: ArbeitsagenturJobV6): string {
  const raw = item.aenderungsdatum ?? item.datumErsteVeroeffentlichung;
  if (!raw) return new Date().toISOString();
  const d = new Date(raw);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function getLocation(item: ArbeitsagenturJobV6): string | null {
  return item.stellenlokationen?.[0]?.adresse?.ort ?? null;
}

export async function fetchArbeitsagenturJobs(
  settings: FetchSettings,
  cursor?: Record<string, unknown>
): Promise<SourceFetchResult> {
  try {
    const page = (cursor?.page as number) ?? 1;
    const keyword = primaryKeyword(settings);
    const location =
      settings.searchLocation.toLowerCase() === "germany"
        ? "Deutschland"
        : settings.searchLocation;

    const params = new URLSearchParams({
      was: keyword,
      wo: location,
      veroeffentlichtseit: String(lookbackDays(settings)),
      page: String(page),
      size: String(Math.min(settings.maxResults, 25)),
    });

    const res = await fetch(`${API_BASE}?${params}`, {
      headers: {
        "X-API-Key": API_KEY,
        Accept: "application/json",
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return {
        jobs: [],
        status: "error",
        error: `Arbeitsagentur API ${res.status}`,
      };
    }

    const data: ArbeitsagenturResponseV6 = await res.json();
    const items = data.ergebnisliste ?? [];

    const jobs: RawJob[] = items
      .filter((item) => {
        const desc = [item.hauptberuf, ...(item.alleBerufe ?? [])].join(" ");
        const postedAt = parsePostedAt(item);
        return (
          matchesJobFilter(
            item.stellenangebotsTitel,
            desc,
            item.alleBerufe,
            settings.jobFilterKeywords
          ) && isWithinLookback(postedAt, settings.lookbackHours)
        );
      })
      .map((item) => {
        const postedAt = parsePostedAt(item);
        const loc = getLocation(item);

        return {
          sourceId: "arbeitsagentur",
          sourceJobId: item.referenznummer,
          title: item.stellenangebotsTitel,
          company: item.firma,
          location: loc,
          remote: item.homeofficemoeglich ? "remote" : "unknown",
          visaSponsorship: "unknown" as const,
          postedAt,
          applyUrl:
            item.externeURL ??
            `https://www.arbeitsagentur.de/jobsuche/jobdetail/${item.referenznummer}`,
          description: [
            item.stellenangebotsTitel,
            item.hauptberuf,
            ...(item.alleBerufe ?? []),
          ].join(" "),
        };
      });

    const hasMore = items.length >= 25 && page < 4;
    return {
      jobs,
      cursor: hasMore ? { page: page + 1 } : undefined,
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
