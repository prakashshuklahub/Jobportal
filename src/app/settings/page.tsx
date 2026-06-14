"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UserProfile } from "@/lib/jobs/scoring/types";
import { SOURCE_METADATA } from "@/lib/jobs/sources/metadata";
import { ALL_SOURCE_IDS } from "@/lib/jobs/fetch-settings";

function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Profile & matching
  const [skills, setSkills] = useState("");
  const [targetTitles, setTargetTitles] = useState("");
  const [preferredLocations, setPreferredLocations] = useState("");
  const [visaRequired, setVisaRequired] = useState(true);
  const [seniority, setSeniority] = useState("mid");
  const [minSalary, setMinSalary] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [matchThreshold, setMatchThreshold] = useState(70);

  // Fetch configuration
  const [enabledSources, setEnabledSources] = useState<string[]>([...ALL_SOURCE_IDS]);
  const [searchKeywords, setSearchKeywords] = useState("");
  const [searchLocation, setSearchLocation] = useState("Germany");
  const [maxResults, setMaxResults] = useState(50);
  const [lookbackHours, setLookbackHours] = useState(24);
  const [jobFilterKeywords, setJobFilterKeywords] = useState("");
  const [dedupeDays, setDedupeDays] = useState(7);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/profile");
        const json = await res.json();
        if (json.profile) {
          const p: UserProfile = json.profile;
          setSkills(p.skills.join(", "));
          setTargetTitles(p.targetTitles.join(", "));
          setPreferredLocations(p.preferredLocations.join(", "));
          setVisaRequired(p.visaRequired);
          setSeniority(p.seniority ?? "mid");
          setMinSalary(p.minSalary ? String(p.minSalary) : "");
          setResumeText(p.resumeText ?? "");
          setMatchThreshold(p.matchThreshold);
          setEnabledSources(
            p.enabledSources.length > 0 ? p.enabledSources : [...ALL_SOURCE_IDS]
          );
          setSearchKeywords(p.searchKeywords.join(", "));
          setSearchLocation(p.searchLocation);
          setMaxResults(p.maxResultsPerSource);
          setLookbackHours(p.lookbackHours);
          setJobFilterKeywords(p.jobFilterKeywords.join(", "));
          setDedupeDays(p.dedupeDays);
        }
      } catch {
        setMessage("Failed to load profile");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function toggleSource(id: string) {
    setEnabledSources((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skills: splitCsv(skills),
          target_titles: splitCsv(targetTitles),
          preferred_locations: splitCsv(preferredLocations),
          visa_required: visaRequired,
          seniority,
          min_salary: minSalary ? Number(minSalary) : null,
          resume_text: resumeText,
          match_threshold: matchThreshold,
          enabled_sources: enabledSources,
          search_keywords: splitCsv(searchKeywords),
          search_location: searchLocation,
          max_results_per_source: maxResults,
          lookback_hours: lookbackHours,
          job_filter_keywords: splitCsv(jobFilterKeywords),
          dedupe_days: dedupeDays,
        }),
      });

      if (!res.ok) throw new Error("Save failed");
      setMessage("Settings saved successfully!");
    } catch {
      setMessage("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Settings</h1>
          <Link href="/jobs" className="text-sm text-blue-600 hover:text-blue-800">
            ← Back to Jobs
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <form onSubmit={handleSave} className="space-y-8">
          {/* Job Sources */}
          <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Job Sources</h2>
              <p className="text-sm text-gray-500 mt-1">
                Choose which portals to fetch from. Apify sources need APIFY_TOKEN.
              </p>
            </div>
            <div className="space-y-3">
              {SOURCE_METADATA.map((source) => (
                <label
                  key={source.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={enabledSources.includes(source.id)}
                    onChange={() => toggleSource(source.id)}
                    className="mt-1 rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {source.name}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                        Phase {source.phase}
                      </span>
                      <span className="text-xs text-gray-400">{source.cost}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{source.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </section>

          {/* Search Configuration */}
          <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Search Configuration</h2>
              <p className="text-sm text-gray-500 mt-1">
                Controls what each portal searches for. First keyword is the primary query.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Keywords (comma-separated)
              </label>
              <input
                type="text"
                value={searchKeywords}
                onChange={(e) => setSearchKeywords(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                placeholder="software engineer, backend developer, software entwickler"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search Location
                </label>
                <input
                  type="text"
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="Germany"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Results per Source
                </label>
                <input
                  type="number"
                  min={10}
                  max={200}
                  value={maxResults}
                  onChange={(e) => setMaxResults(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lookback Window: {lookbackHours}h
                </label>
                <input
                  type="range"
                  min={6}
                  max={72}
                  step={6}
                  value={lookbackHours}
                  onChange={(e) => setLookbackHours(Number(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-gray-400 mt-1">Only jobs posted within this window</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dedupe Window (days)
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={dedupeDays}
                  onChange={(e) => setDedupeDays(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">Skip re-posted jobs within N days</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job Filter Keywords (optional)
              </label>
              <input
                type="text"
                value={jobFilterKeywords}
                onChange={(e) => setJobFilterKeywords(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                placeholder="Leave empty to use built-in software/IT keywords"
              />
              <p className="text-xs text-gray-400 mt-1">
                Client-side filter after fetch. Empty = default tech keyword list.
              </p>
            </div>
          </section>

          {/* Profile & Matching */}
          <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Profile & Matching</h2>
              <p className="text-sm text-gray-500 mt-1">
                Used to score jobs. Only listings at or above the threshold are shown.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Skills (comma-separated)
              </label>
              <input
                type="text"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                placeholder="TypeScript, React, Node.js, Python"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Job Titles (comma-separated)
              </label>
              <input
                type="text"
                value={targetTitles}
                onChange={(e) => setTargetTitles(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                placeholder="Software Engineer, Backend Developer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preferred Locations (comma-separated)
              </label>
              <input
                type="text"
                value={preferredLocations}
                onChange={(e) => setPreferredLocations(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                placeholder="Berlin, Munich, Remote"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Seniority
                </label>
                <select
                  value={seniority}
                  onChange={(e) => setSeniority(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="junior">Junior</option>
                  <option value="mid">Mid</option>
                  <option value="senior">Senior</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min Salary (EUR/year)
                </label>
                <input
                  type="number"
                  value={minSalary}
                  onChange={(e) => setMinSalary(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="60000"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="visa"
                checked={visaRequired}
                onChange={(e) => setVisaRequired(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="visa" className="text-sm text-gray-700">
                I require visa sponsorship
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Match Threshold: {matchThreshold}%
              </label>
              <input
                type="range"
                min={40}
                max={95}
                value={matchThreshold}
                onChange={(e) => setMatchThreshold(Number(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-gray-400 mt-1">
                65% = more jobs, 75% = tighter fit, 70% = balanced (recommended starting point)
              </p>
            </div>
          </section>

          {/* Future: Resume for Gemini-powered generation (cover letter + tailored resume)
          <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Resume for LLM</h2>
              <p className="text-sm text-gray-500 mt-1">
                Base content used when generating tailored resumes and cover letters via Gemini.
              </p>
            </div>
            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              rows={8}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              placeholder="Paste your base resume content here..."
            />
          </section>
          */}

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>

          {message && (
            <p
              className={`text-sm ${
                message.includes("success") ? "text-green-600" : "text-red-600"
              }`}
            >
              {message}
            </p>
          )}
        </form>
      </main>
    </div>
  );
}
