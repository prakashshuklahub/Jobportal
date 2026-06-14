# Jobportal

# Germany Software Jobs — Feature Specification (MVP)

> Status: Draft v1 — written to be sufficient for an LLM coding agent (e.g. Claude Code / Cursor) to implement the MVP end-to-end without further clarification on scope. Open questions are flagged explicitly at the end.

---

## 1. Goal

Build a personal job-discovery feature that:

1. Pulls **software/IT job postings in Germany** from multiple portals.
2. Keeps only **jobs posted in the last 24 hours**.
3. Runs only on a **work-search schedule (Tue–Sat)** — no fetching on Sunday/Monday.
4. Shows results as **compact cards** with only the essential info needed to decide whether to open the job (portal, title, company, salary, location, visa sponsorship, posted date).
5. **Scores each job against the user's profile/resume** and only surfaces jobs above a configurable match threshold (default **70%**).
6. Gives the user **3 actions per job**: `Apply`, `Create Resume`, `Create Cover Letter`.
7. (Future, not MVP) Persist generated resumes/cover letters and full job listing history to the DB.

---

## 2. Source Portals — Feasibility & Sourcing Plan

13 target portals were evaluated for the cheapest reliable way to pull data (official API → free public API → cheap structured scraper → generic scraper → defer).

### 2.1 Phase 1 (MVP) — confirmed feasible, low/zero cost

| # | Portal | Method | Cost | Notes |
|---|--------|--------|------|-------|
| 1 | **Arbeitnow** | Official free public JSON API: `https://www.arbeitnow.com/api/job-board-api` | **Free** | No auth required. Supports `visa_sponsorship=true/false` filter, pagination, tags, remote flag. Best-documented and cheapest source — prioritize this. |
| 2 | **Federal Employment Agency Jobs (Bundesagentur für Arbeit / arbeitsagentur.de)** | Unofficial but well-documented "Jobsuche" REST API used by the official mobile app (`https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/app/jobs`), auth via static header `X-API-Key: jobboerse-jobsuche` | **Free** | Reference implementation: `bundesAPI/jobsuche-api` on GitHub. Largest German job database (1M+ postings). No official SLA — treat as best-effort and add resilient error handling/fallback. |
| 3 | **LinkedIn Jobs** | Apify actor using LinkedIn's public **guest API** (no login/cookies) | ~$0.0005–$0.001 per job (~$0.5–1 per 1,000) | Multiple maintained actors at this price point (e.g. `automation-lab/linkedin-jobs-scraper`, `apivault_labs/linkedin-jobs-scraper`). Cap caps at ~1,000 results per query — fine for a 24h window. |
| 4 | **StepStone Germany** | Apify actor (e.g. `santamaria-automations/stepstone-de-scraper`, `jupri/stepstone-scraper`) | ~$1 per 1,000 results | Structured JSON output (title, company, location, salary, contract type). Some actors require monthly rental ($0–20/mo) — pick a pay-per-result one. |
| 5 | **GermanTechJobs** | Apify actor `unfenced-group/germantechjobs-scraper` | Pay-per-result (low, similar order to above) | Niche but high-quality German tech listings (~3,000 jobs), includes salary ranges and tech stack. |
| 6 | **Wellfound (formerly AngelList Talent)** | Apify actor (e.g. `gio21/wellfound-jobs-scraper`, `thirdwatch/wellfound-jobs-scraper`) | Pay-per-result, low | Mostly global/remote — filter results to Germany-based or remote-from-Germany roles client-side. Includes equity/salary data which is a nice bonus. |

**Phase 1 covers 6 of 13 portals**, all either free or low single-digit-cents-per-1000 via Apify. This is sufficient for a usable MVP and should produce a healthy daily volume of software jobs.

### 2.2 Phase 2 — feasible but higher cost / higher anti-bot risk

| # | Portal | Method | Cost | Notes |
|---|--------|--------|------|-------|
| 7 | **Indeed Germany** | Indeed's official Publisher API is discontinued (no new accounts). Apify scrapers exist (e.g. real-time scrapers around $3 per 1,000). | ~$3 per 1,000 | Works, but pricier and more fragile (frequent anti-bot changes). Add in Phase 2 once Phase 1 pipeline is stable. |
| 8 | **XING Jobs** | Apify actors exist but **require residential proxies** due to strict anti-bot (DataDome-class protection). | Higher — proxy costs add up | Lower priority; DACH-focused but smaller software-job volume than StepStone/LinkedIn for our purposes. |

### 2.3 Phase 3 / Backlog — not yet confirmed, needs investigation before committing

No official API, RSS feed, or maintained scraper actor was found for these during initial research. Each needs a short spike (check for sitemap.xml / JSON-LD `JobPosting` structured data on listing pages, which many job boards embed for SEO and which can be scraped cheaply without a paid actor):

| # | Portal | Suggested next step |
|---|--------|---------------------|
| 9 | **WeAreDevelopers Jobs** | Check for JSON-LD `JobPosting` schema on job pages; if present, a lightweight Cheerio/Playwright scraper (self-hosted, no Apify cost) may suffice. |
| 10 | **DEVjobs Germany** | Same — check structured data / sitemap first. |
| 11 | **get in IT** | Same. |
| 12 | **EuroTechJobs** | Same. |
| 13 | **Make it in Germany Jobs** | This is a government portal; it may simply mirror the Bundesagentur für Arbeit / EURES dataset already covered by source #2 — verify overlap before building a separate fetcher (likely **not needed** as a distinct source). |

> **Recommendation for MVP**: Implement sources 1–6. Build the ingestion layer so adding a new source is just "write one fetcher that returns `RawJob[]`" — this keeps Phase 2/3 additive with zero refactor.

---

## 3. Functional Requirements

### 3.1 Ingestion & Scheduling

- A scheduled job (cron) runs **once per day**, **only Tuesday–Saturday** (German calendar — i.e. matches the user's actual job-search days). No run on Sunday or Monday.
- Each run:
  1. Calls each enabled source's fetcher.
  2. Normalizes results into a common `RawJob` shape (see §5).
  3. Filters to jobs with `postedAt >= now - 24h` (or `postedAt` unknown → treat as "today" only if source guarantees recency, e.g. Arbeitnow's default sort).
  4. Deduplicates against existing DB rows (same job re-posted across portals or re-fetched).
  5. Runs the **match scoring** for the active user profile.
  6. Persists jobs + scores that meet the match threshold (default **≥ 70%**, configurable).
- Vercel Hobby constraint: a single serverless function invocation has a **10-second timeout** and **no reliable background execution** (`after()` is best-effort only). Therefore:
  - The cron endpoint must **fan out** — one lightweight cron trigger that enqueues per-source fetch jobs (e.g. via Supabase `pg_cron` + a queue table, or by calling each source fetcher as its own short-lived API route invoked sequentially with early return + continuation token).
  - Each per-source fetcher must complete (or checkpoint pagination) within ~8 seconds to leave margin.
  - If a source times out mid-pagination, store a `cursor`/`page` checkpoint so the next run resumes rather than restarting.

### 3.2 Job Card (UI)

Each job is shown as a card with **only**:

- Portal/source name (with small logo/badge)
- Job title
- Company name
- Location (city + remote/hybrid/onsite flag)
- Salary (if available; show "Not disclosed" otherwise)
- Visa sponsorship indicator (Yes / No / Unknown)
- Posted date/time (relative, e.g. "6h ago")
- Match score (e.g. "82% match") with a visual bar/badge
- 3 CTAs: **Apply**, **Create Resume**, **Create Cover Letter**

Everything else (full JD, requirements, benefits) is left to the original posting — **do not** try to reproduce the full JD in the card. Clicking the card or "Apply" opens the original posting URL in a new tab.

### 3.3 Matching / Scoring

- User maintains a **profile** (skills, years of experience, target roles, locations, visa status, salary expectations, preferred languages).
- A pure scoring function (no I/O) computes a `matchScore` (0–100) per job using:
  - Skill overlap (job's extracted tech stack vs. user's skills) — primary weight.
  - Role/title similarity.
  - Location match (city match, or remote acceptance).
  - Visa sponsorship requirement vs. user's need.
  - Seniority/experience-level alignment.
- Only jobs with `matchScore >= threshold` (default 70, user-configurable) are shown.
- MVP scoring is **rule-based / keyword + weighted scoring** (cheap, deterministic, no LLM cost). An optional Phase 2 enhancement can use an LLM (Claude Haiku) to re-rank the top N candidates for nuance — but this is **not required for MVP**.

### 3.4 CTAs

| CTA | MVP behavior |
|-----|--------------|
| **Apply** | Opens the original job posting URL (`job.applyUrl`) in a new tab. No DB write. |
| **Create Resume** | Sends the job description + user's base resume/profile to an LLM (Claude Haiku, cost-efficient) to generate a tailored resume. Result shown in-app (e.g. markdown/preview + download as PDF/DOCX). **MVP: ephemeral, not persisted.** |
| **Create Cover Letter** | Same pattern — LLM generates a tailored cover letter from job description + user profile. **MVP: ephemeral, not persisted.** |

### 3.5 Future (explicitly out of MVP scope)

- Persist all fetched job listings (full history, not just matches) to DB for analytics/trends.
- Persist generated resumes & cover letters per job, with versioning.
- Notifications (email/push) for new high-match jobs.
- Multi-user support (MVP assumes a single user/profile).

---

## 4. Architecture

Consistent with the existing project conventions: **Next.js (App Router) + Supabase (Postgres, Auth, Storage) + Vercel Hobby**, TypeScript throughout, strict separation of **fetch logic** (I/O, per-source adapters) from **scoring/matching logic** (pure functions, unit-testable) — same pattern as the scoring libraries used elsewhere in this project family.

```
/app
  /api
    /cron
      /jobs-fetch/route.ts        -- triggered by scheduler, fans out to sources
    /jobs
      /route.ts                   -- GET: list scored jobs for current user
      /[id]/resume/route.ts       -- POST: generate tailored resume (LLM)
      /[id]/cover-letter/route.ts -- POST: generate tailored cover letter (LLM)
  /jobs
    page.tsx                      -- main job feed UI (cards)
    /components
      JobCard.tsx
      MatchBadge.tsx
      ResumeModal.tsx
      CoverLetterModal.tsx

/lib
  /jobs
    /sources
      arbeitnow.ts                -- fetcher: RawJob[]
      arbeitsagentur.ts           -- fetcher: RawJob[]
      linkedin.ts                 -- fetcher via Apify actor run
      stepstone.ts                -- fetcher via Apify actor run
      germantechjobs.ts           -- fetcher via Apify actor run
      wellfound.ts                -- fetcher via Apify actor run
      types.ts                    -- RawJob, NormalizedJob types
      normalize.ts                -- per-source -> NormalizedJob mapping
    /scoring
      score-job.ts                -- pure function: (job, profile) => matchScore
      extract-skills.ts           -- pure function: text -> skill[] (keyword/regex based)
      types.ts                    -- UserProfile, ScoreBreakdown
    /dedupe.ts                    -- pure function: hash/compare jobs
    /schedule.ts                  -- pure function: isFetchDay(date) -> boolean (Tue-Sat)
    /apify-client.ts              -- thin wrapper around Apify run + dataset fetch

/supabase
  /migrations
    ...sql for tables below
```

### 4.1 External Services

| Service | Purpose | Tier |
|---------|---------|------|
| **Vercel** | Hosting, Cron Triggers, serverless API routes | Hobby (free) |
| **Supabase** | Postgres DB, Auth, (optional) Storage for generated docs in Phase 2 | Free tier |
| **Arbeitnow public API** | Source #1 | Free |
| **Arbeitsagentur Jobsuche (unofficial) API** | Source #2 | Free |
| **Apify** | Actor runs for LinkedIn, StepStone, GermanTechJobs, Wellfound | Pay-per-event; Apify free tier ($5/mo credit) likely covers MVP volume |
| **Anthropic API (Claude Haiku)** | Resume & cover letter generation | Pay-per-token, low cost on Haiku |

### 4.2 Scheduling on Vercel Hobby

- Vercel Hobby supports Cron Jobs but with restricted frequency (effectively daily). Configure **one daily cron** (`vercel.json` → `crons`) hitting `/api/cron/jobs-fetch`.
- Inside the handler, **first check `isFetchDay(new Date())`** (Tue–Sat in Europe/Berlin timezone) — if false, return immediately (no-op). This keeps the cron config simple (runs every day) while enforcing the off-day rule in code.
- Because of the 10s function timeout, the handler should call each source fetcher with a per-source timeout budget (e.g. ~1.5s for the two free JSON APIs, and async-trigger + poll pattern for Apify actors which can run longer — store `runId` and resolve in a follow-up invocation if needed, or use Apify's synchronous "run-sync-get-dataset-items" endpoint for small result sets).

---

## 5. Data Model

### 5.1 `RawJob` (per-source adapter output, before normalization)

```ts
interface RawJob {
  sourceId: string;          // e.g. "arbeitnow", "linkedin"
  sourceJobId: string;        // portal's own ID/slug
  title: string;
  company: string;
  location: string | null;
  remote: 'remote' | 'hybrid' | 'onsite' | 'unknown';
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  visaSponsorship: 'yes' | 'no' | 'unknown';
  postedAt: string;            // ISO timestamp
  applyUrl: string;
  description: string;         // raw JD text, used only for scoring/extraction, not shown verbatim in UI beyond original posting
  tags?: string[];
}
```

### 5.2 Supabase tables

```sql
-- jobs: deduplicated, normalized listings that passed the 24h + scoring filter
create table jobs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  source_job_id text not null,
  title text not null,
  company text not null,
  location text,
  remote_type text not null default 'unknown', -- remote | hybrid | onsite | unknown
  salary_min numeric,
  salary_max numeric,
  currency text,
  visa_sponsorship text not null default 'unknown', -- yes | no | unknown
  posted_at timestamptz not null,
  apply_url text not null,
  description text,
  tags text[],
  dedupe_hash text not null unique,
  fetched_at timestamptz not null default now(),
  match_score int,            -- 0-100, computed at ingestion time for MVP single-user
  match_breakdown jsonb,       -- per-criterion contribution, for debugging/tuning
  created_at timestamptz not null default now()
);

create index jobs_posted_at_idx on jobs (posted_at desc);
create index jobs_match_score_idx on jobs (match_score desc);

-- user_profile: single-row (MVP) profile used for scoring
create table user_profile (
  id uuid primary key default gen_random_uuid(),
  skills text[] not null default '{}',
  target_titles text[] not null default '{}',
  preferred_locations text[] not null default '{}', -- e.g. ['Berlin','Munich','Remote']
  visa_required boolean not null default true,
  seniority text,             -- e.g. 'mid', 'senior'
  min_salary numeric,
  resume_text text,           -- base resume content used for LLM tailoring
  match_threshold int not null default 70,
  updated_at timestamptz not null default now()
);

-- source_fetch_state: pagination/checkpoint per source, for resumable fetch
create table source_fetch_state (
  source text primary key,
  last_run_at timestamptz,
  cursor jsonb,
  last_status text,
  last_error text
);
```

> Future tables (not MVP): `generated_resumes`, `generated_cover_letters`, `job_listing_archive` (all jobs regardless of match, for trend analysis).

---

## 6. Pipeline Detail

1. **Trigger**: daily Vercel Cron → `/api/cron/jobs-fetch`.
2. **Day check**: `isFetchDay()` — if today is Sun/Mon (Europe/Berlin), exit early with `204`.
3. **Per-source fetch** (parallel where possible, respecting timeouts):
   - `arbeitnow.ts`: `GET https://www.arbeitnow.com/api/job-board-api?visa_sponsorship=true` (and a second call without the filter, or rely on the field returned per job) — filter client-side to IT/software job categories and `created_at >= now-24h`.
   - `arbeitsagentur.ts`: `GET https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v6/jobs` with header `X-API-Key: jobboerse-jobsuche`, query params for `was` (search term, e.g. "Software Entwickler"), `wo` (Germany), `veroeffentlichtseit=1` (published within last 1 day).
   - `linkedin.ts`, `stepstone.ts`, `germantechjobs.ts`, `wellfound.ts`: trigger the respective Apify actor (via `apify-client.ts`) with search params scoped to Germany + software/IT roles + last-24h filter where the actor supports it; otherwise fetch broader and filter `postedAt` client-side.
4. **Normalize**: each source's raw output → `RawJob[]` → `NormalizedJob` (consistent field names/units, e.g. salary annualized in EUR).
5. **Dedupe**: compute `dedupeHash = hash(normalizedTitle + normalizedCompany + location)`; skip if a job with this hash already exists in `jobs` (any source) within the last N days.
6. **Score**: `score-job.ts` computes `matchScore` + `matchBreakdown` against the single `user_profile` row.
7. **Filter**: keep only `matchScore >= user_profile.match_threshold`.
8. **Persist**: insert into `jobs`.
9. **Checkpoint**: update `source_fetch_state` per source.

---

## 7. Scoring Algorithm (MVP, rule-based)

Pure function, no network calls — fully unit-testable.

```ts
function scoreJob(job: NormalizedJob, profile: UserProfile): { score: number; breakdown: Record<string, number> } {
  // weights sum to 100
  const weights = {
    skillsOverlap: 40,
    titleSimilarity: 20,
    location: 15,
    visa: 15,
    seniority: 10,
  };

  const jobSkills = extractSkills(job.description + ' ' + job.title);
  const skillsOverlap = jaccardOverlap(jobSkills, profile.skills); // 0..1

  const titleSimilarity = bestTitleMatch(job.title, profile.targetTitles); // 0..1

  const location = locationMatchScore(job, profile); // 0..1 (remote/city match)

  const visa = visaMatchScore(job.visaSponsorship, profile.visaRequired); // 0..1
  // e.g. if profile.visaRequired and job.visaSponsorship === 'no' -> 0
  //      if 'unknown' -> 0.5 (don't over-penalize missing data)

  const seniority = seniorityMatchScore(job.title, job.description, profile.seniority); // 0..1

  const breakdown = {
    skillsOverlap: skillsOverlap * weights.skillsOverlap,
    titleSimilarity: titleSimilarity * weights.titleSimilarity,
    location: location * weights.location,
    visa: visa * weights.visa,
    seniority: seniority * weights.seniority,
  };

  const score = Math.round(Object.values(breakdown).reduce((a, b) => a + b, 0));
  return { score, breakdown };
}
```

- `extractSkills`: keyword/regex match against a curated software-skills dictionary (languages, frameworks, tools, cloud platforms). Keep this dictionary as a static JSON file, easy to extend.
- The **70% default threshold** is stored in `user_profile.match_threshold` and adjustable via a settings UI — not hardcoded.
- Phase 2 (optional): pass the top-scoring jobs (e.g. score 60–85, the "borderline" band) through Claude Haiku for a nuanced re-score/explanation, to catch cases the keyword model misses.

---

## 8. UI Notes

- Job feed page (`/jobs`) lists cards sorted by `match_score desc, posted_at desc`.
- Filters: portal, location, remote type, visa sponsorship, min salary — all client-side filters on already-fetched/scored data (no extra fetch).
- "Create Resume" / "Create Cover Letter" open a modal showing the LLM-generated content with a **Download (PDF/DOCX)** and **Copy** action. MVP: content is generated on-demand and not saved — regenerating produces a fresh result.
- Empty state: if today is Sun/Mon, show a friendly message ("No new jobs today — next refresh on Tuesday") rather than an empty/error state.

---

## 9. Open Questions / Assumptions to confirm before/while implementing

1. **Job category filter**: "software jobs" — confirm the keyword/title filter list (e.g. "Software Engineer", "Backend Developer", "Frontend Developer", "DevOps", "Data Engineer", "ML Engineer", etc.) used to scope each source's query, since not all sources support category filters natively.
2. **Single-user assumption**: MVP assumes one `user_profile` row. Confirm this is acceptable (no auth/multi-tenant needed yet).
3. **Apify account**: needs an Apify account + API token (free tier $5/mo credit). Confirm Prakash has/will create one, and store the token as a Vercel env var (`APIFY_TOKEN`).
4. **Arbeitsagentur API stability**: it's unofficial/reverse-engineered — confirm acceptable risk (could break without notice; add monitoring/alerting on repeated failures via `source_fetch_state.last_error`).
5. **"Make it in Germany"**: likely redundant with source #2 (Bundesagentur) — confirm before building a separate fetcher.
6. **Salary currency/normalization**: confirm all salaries should be normalized to annual EUR for consistent display/sorting.
7. **LLM provider for resume/cover letter**: assumed Anthropic Claude Haiku via the existing Anthropic API key — confirm.