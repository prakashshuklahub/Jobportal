"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { JobRow } from "@/lib/jobs/sources/types";
import { JobCard } from "./components/JobCard";
// Future: import { ContentModal } from "./components/ContentModal";
import Link from "next/link";

interface JobsResponse {
  jobs: JobRow[];
  isFetchDay: boolean;
  offDayMessage: string;
  matchThreshold: number;
}

export default function JobsPage() {
  const [data, setData] = useState<JobsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fetching, setFetching] = useState(false);

  const [filterSource, setFilterSource] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterRemote, setFilterRemote] = useState("");
  const [filterVisa, setFilterVisa] = useState("");
  const [filterMinSalary, setFilterMinSalary] = useState("");

  // Future: resume / cover letter modal state
  // const [modalJob, setModalJob] = useState<JobRow | null>(null);
  // const [modalType, setModalType] = useState<"resume" | "cover-letter" | null>(null);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/jobs");
      if (!res.ok) throw new Error("Failed to load jobs");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const filteredJobs = useMemo(() => {
    if (!data?.jobs) return [];
    return data.jobs.filter((job) => {
      if (filterSource && job.source !== filterSource) return false;
      if (
        filterLocation &&
        !(job.location ?? "").toLowerCase().includes(filterLocation.toLowerCase())
      )
        return false;
      if (filterRemote && job.remoteType !== filterRemote) return false;
      if (filterVisa && job.visaSponsorship !== filterVisa) return false;
      if (filterMinSalary) {
        const min = Number(filterMinSalary);
        if (job.salaryMax && job.salaryMax < min) return false;
        if (!job.salaryMin && !job.salaryMax) return false;
      }
      return true;
    });
  }, [data, filterSource, filterLocation, filterRemote, filterVisa, filterMinSalary]);

  async function handleManualFetch() {
    setFetching(true);
    setError("");
    try {
      const res = await fetch("/api/cron/jobs-fetch?force=true");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof json.error === "string" ? json.error : "Fetch failed"
        );
      }
      const results = json.results as
        | Array<{ error?: string; inserted?: number; fetched?: number; skipped?: number }>
        | undefined;
      const setupError = results?.find((r) => r.error?.includes("Database tables"));
      if (setupError?.error) throw new Error(setupError.error);

      const totalInserted = results?.reduce((n, r) => n + (r.inserted ?? 0), 0) ?? 0;
      const totalFetched = results?.reduce((n, r) => n + (r.fetched ?? 0), 0) ?? 0;
      void totalInserted;

      await loadJobs();

      const reloadRes = await fetch("/api/jobs");
      const reloadData = await reloadRes.json();
      const jobCount = reloadData.jobs?.length ?? 0;

      if (jobCount === 0 && totalFetched > 0) {
        setError(
          `Found ${totalFetched} jobs but none met your ${reloadData.matchThreshold ?? 70}% threshold. Lower it in Settings (try 55–60%).`
        );
      } else if (jobCount === 0 && results?.every((r) => r.error)) {
        throw new Error(results[0]?.error ?? "No jobs fetched");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fetch failed");
    } finally {
      setFetching(false);
    }
  }

  // Future: Gemini-powered resume / cover letter generation
  // async function generateContent(type: "resume" | "cover-letter"): Promise<string> {
  //   if (!modalJob) throw new Error("No job selected");
  //   const res = await fetch(`/api/jobs/${modalJob.id}/${type}`, { method: "POST" });
  //   const json = await res.json();
  //   if (!res.ok) throw new Error(json.error ?? "Generation failed");
  //   return json.content;
  // }

  const sources = [...new Set((data?.jobs ?? []).map((j) => j.source))];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Germany Software Jobs
            </h1>
            {data && (
              <p className="text-sm text-gray-500">
                {filteredJobs.length} jobs · {data.matchThreshold}%+ match
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleManualFetch}
              disabled={fetching}
              className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50"
            >
              {fetching ? "Fetching..." : "Refresh Jobs"}
            </button>
            <Link
              href="/settings"
              className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Settings
            </Link>
            <button
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                window.location.href = "/login";
              }}
              className="px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-800"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {data?.offDayMessage && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
            {data.offDayMessage} You can still use Refresh Jobs to fetch manually.
          </div>
        )}

        <div className="mb-6 flex flex-wrap gap-3">
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
          >
            <option value="">All portals</option>
            {sources.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Location"
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white w-32"
          />
          <select
            value={filterRemote}
            onChange={(e) => setFilterRemote(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
          >
            <option value="">All types</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="onsite">On-site</option>
          </select>
          <select
            value={filterVisa}
            onChange={(e) => setFilterVisa(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
          >
            <option value="">All visa</option>
            <option value="yes">Visa: Yes</option>
            <option value="no">Visa: No</option>
            <option value="unknown">Visa: Unknown</option>
          </select>
          <input
            type="number"
            placeholder="Min salary"
            value={filterMinSalary}
            onChange={(e) => setFilterMinSalary(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white w-28"
          />
        </div>

        {loading && (
          <div className="text-center py-12 text-gray-500">Loading jobs...</div>
        )}

        {error && (
          <div className="text-center py-12 text-red-600">{error}</div>
        )}

        {!loading && !error && filteredJobs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-2">No matching jobs found.</p>
            <p className="text-sm text-gray-400 mb-4">
              Click <strong>Refresh Jobs</strong> to fetch listings, then check Settings if jobs
              are filtered by match threshold.
            </p>
            <Link
              href="/settings"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Open Settings →
            </Link>
          </div>
        )}

        <div className="space-y-4">
          {filteredJobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      </main>

      {/* Future: ContentModal for Gemini-generated resume / cover letter
      <ContentModal
        title={
          modalType === "resume"
            ? `Resume — ${modalJob?.title ?? ""}`
            : `Cover Letter — ${modalJob?.title ?? ""}`
        }
        isOpen={modalJob !== null && modalType !== null}
        onClose={() => {
          setModalJob(null);
          setModalType(null);
        }}
        onGenerate={() =>
          generateContent(modalType === "resume" ? "resume" : "cover-letter")
        }
      />
      */}
    </div>
  );
}
