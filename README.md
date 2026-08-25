# 🇩🇪 Jobportal — Germany Software Jobs

> Job discovery for software roles in Germany: pulls multiple portals, keeps only what was posted
> in the last 24 hours, scores every listing against your resume, and drafts the CV and cover letter.

<p align="left">
  <a href="https://jobportal-eight-lyart.vercel.app"><img src="https://img.shields.io/badge/Live%20demo-000?style=for-the-badge&logo=vercel&logoColor=white" alt="Live demo" /></a>
  <img src="https://img.shields.io/badge/Next.js-000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/Gemini-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white" alt="Gemini" />
</p>

**[▶ Try it live](https://jobportal-eight-lyart.vercel.app)**

## The problem

Searching for a role across a dozen German job boards means the same listings over and over, most
of them stale, and no quick way to tell which ones are actually worth an application. This does the
filtering first so you only read what fits.

## What it does

- **Aggregates multiple portals** — Arbeitnow, Bundesagentur für Arbeit and Apify-backed sources,
  each normalised into one shape.
- **Last 24 hours only.** Anything older is dropped, so you never re-read yesterday's board.
- **Deduplicates** across portals — the same job posted in three places shows up once.
- **Scores each listing against your profile.** A skills dictionary extracts requirements from the
  posting and matches them to your resume; only jobs above a configurable threshold (default
  **70%**) surface, each with a match badge.
- **Three actions per job** — Apply, Create Resume, Create Cover Letter. The last two are generated
  with **Gemini**, tailored to that specific posting.
- **Runs on a work-search schedule.** A Vercel cron fires daily at 06:00 UTC; the pipeline only
  actually fetches on work-search days (Tue–Sat), so the list is fresh when you sit down to it and
  idle when you don't.

## Architecture

| Layer | Path | Role |
|---|---|---|
| Sources | `src/lib/jobs/sources/` | Per-portal adapters + `normalize.ts` into a shared shape |
| Pipeline | `src/lib/jobs/pipeline.ts` | Fetch → normalise → dedupe → score → persist |
| Scoring | `src/lib/jobs/scoring/` | Skills extraction and job-vs-profile match scoring |
| Scheduling | `src/lib/jobs/schedule.ts` | Tue–Sat work-search window |
| Cron | `src/app/api/cron/jobs-fetch/` | Scheduled fetch entry point |
| Generation | `src/app/api/jobs/[id]/{resume,cover-letter}/` | Gemini-drafted documents |
| Data | `supabase/migrations/` | Postgres schema |
| UI | `src/app/jobs/` | Compact job cards with match badge and detail modal |

## Run it locally

```bash
git clone https://github.com/prakashshuklahub/Jobportal.git
cd Jobportal
npm install
cp .env.example .env.local   # then fill in the values below
npm run dev
```

Required environment variables:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side writes from the pipeline |
| `GEMINI_API_KEY` | Resume and cover-letter generation |
| `APIFY_TOKEN` | Apify-backed portal sources |
| `APP_PASSWORD` | Password for the single-user login |
| `CRON_SECRET` | Shared secret guarding the cron route |

Apply the database schema from `supabase/migrations/` before the first run.

## Documentation

The full MVP feature specification — portal-by-portal sourcing feasibility, scoring rules and data
model — lives in **[docs/SPEC.md](docs/SPEC.md)**.

---

Built by **[Prakash Shukla](https://github.com/prakashshuklahub)** ·
[The Hustling Engineer](https://www.youtube.com/@TheHustlingEngineer)
