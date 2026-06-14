"use client";

import { JobRow } from "@/lib/jobs/sources/types";
import { MatchBadge } from "./MatchBadge";
import {
  formatRelativeTime,
  formatSalary,
  SOURCE_LABELS,
} from "@/lib/utils/format";

interface JobCardProps {
  job: JobRow;
}

function VisaBadge({ visa }: { visa: string }) {
  const styles: Record<string, string> = {
    yes: "bg-green-100 text-green-700",
    no: "bg-red-100 text-red-700",
    unknown: "bg-gray-100 text-gray-600",
  };
  const labels: Record<string, string> = {
    yes: "Visa: Yes",
    no: "Visa: No",
    unknown: "Visa: Unknown",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${styles[visa] ?? styles.unknown}`}>
      {labels[visa] ?? labels.unknown}
    </span>
  );
}

function RemoteBadge({ remote }: { remote: string }) {
  if (remote === "unknown") return null;
  const labels: Record<string, string> = {
    remote: "Remote",
    hybrid: "Hybrid",
    onsite: "On-site",
  };
  return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
      {labels[remote] ?? remote}
    </span>
  );
}

export function JobCard({ job }: JobCardProps) {
  const source = SOURCE_LABELS[job.source] ?? {
    name: job.source,
    color: "bg-gray-100 text-gray-700",
  };

  return (
    <article className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${source.color}`}>
              {source.name}
            </span>
            <span className="text-xs text-gray-400">
              {formatRelativeTime(job.postedAt)}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {job.title}
          </h3>
          <p className="text-sm text-gray-600">{job.company}</p>
        </div>
        {job.matchScore != null && <MatchBadge score={job.matchScore} />}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4 text-sm text-gray-500">
        {job.location && <span>{job.location}</span>}
        <RemoteBadge remote={job.remoteType} />
        <VisaBadge visa={job.visaSponsorship} />
        <span className="text-gray-400">·</span>
        <span>{formatSalary(job.salaryMin, job.salaryMax, job.currency)}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        <a
          href={job.applyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Apply
        </a>

        {/* Future: Create Resume / Cover Letter via Gemini API
        <button
          onClick={() => onCreateResume(job)}
          className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
        >
          Create Resume
        </button>
        <button
          onClick={() => onCreateCoverLetter(job)}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Create Cover Letter
        </button>
        */}
      </div>
    </article>
  );
}
