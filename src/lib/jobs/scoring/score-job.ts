import { NormalizedJob } from "../sources/types";
import { UserProfile, ScoreResult } from "./types";
import { extractSkills, jaccardOverlap } from "./extract-skills";

const WEIGHTS = {
  skillsOverlap: 40,
  titleSimilarity: 20,
  location: 15,
  visa: 15,
  seniority: 10,
};

const SOFTWARE_ROLE =
  /software|entwickler|developer|engineer|devops|programmer|fullstack|full.stack|sre|architect/i;

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\(m\/w\/d\)/gi, "")
    .replace(/entwickler(in)?/gi, "developer")
    .replace(/ingenieur(in)?/gi, "engineer")
    .replace(/software-/gi, "software ")
    .replace(/[^\w\s+#.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isSoftwareRole(title: string): boolean {
  return SOFTWARE_ROLE.test(title);
}

function profileSkillsInJobText(profileSkills: string[], jobText: string): number {
  if (profileSkills.length === 0) return 0;
  const lower = jobText.toLowerCase();
  const matched = profileSkills.filter((s) => lower.includes(s.toLowerCase())).length;
  return matched / profileSkills.length;
}

function bestTitleMatch(jobTitle: string, targetTitles: string[]): number {
  if (targetTitles.length === 0) return 0.5;

  const normalizedJob = normalizeTitle(jobTitle);
  let best = 0;

  for (const target of targetTitles) {
    const normalizedTarget = normalizeTitle(target);

    if (
      normalizedJob.includes(normalizedTarget) ||
      normalizedTarget.includes(normalizedJob)
    ) {
      best = Math.max(best, 1);
      continue;
    }

    const jobWords = normalizedJob.split(" ").filter(Boolean);
    const targetWords = normalizedTarget.split(" ").filter(Boolean);
    const coreWords = new Set(["software", "developer", "engineer", "backend", "frontend", "full", "stack"]);

    const jobCore = jobWords.filter((w) => coreWords.has(w) || w.length > 3);
    const targetCore = targetWords.filter((w) => coreWords.has(w) || w.length > 3);

    if (jobCore.length > 0 && targetCore.length > 0) {
      const overlap = targetCore.filter((w) =>
        jobCore.some((jw) => jw.includes(w) || w.includes(jw))
      ).length;
      best = Math.max(best, overlap / targetCore.length);
    }
  }

  // German "Software-Entwickler" ↔ "Software Engineer"
  if (
    isSoftwareRole(jobTitle) &&
    targetTitles.some((t) => isSoftwareRole(t))
  ) {
    best = Math.max(best, 0.9);
  }

  return best;
}

function locationMatchScore(job: NormalizedJob, profile: UserProfile): number {
  const prefs = profile.preferredLocations.map((l) => l.toLowerCase());
  if (prefs.length === 0) return 0.5;

  if (prefs.includes("remote") && job.remoteType === "remote") return 1;
  if (job.remoteType === "remote" && prefs.some((p) => p.includes("remote"))) return 1;

  const jobLoc = (job.location ?? "").toLowerCase();

  for (const pref of prefs) {
    if (pref === "remote" || pref === "germany" || pref === "deutschland") continue;
    if (jobLoc.includes(pref) || pref.includes(jobLoc)) return 1;
  }

  if (job.remoteType === "hybrid") return 0.65;

  // German nationwide sources — still relevant if user searches Germany
  if (
    (prefs.includes("germany") || prefs.includes("deutschland") || prefs.length > 0) &&
    (job.source === "arbeitsagentur" || job.source === "arbeitnow" || jobLoc.length > 0)
  ) {
    return 0.7;
  }

  return 0.35;
}

function visaMatchScore(jobVisa: string, visaRequired: boolean): number {
  if (!visaRequired) return 1;
  if (jobVisa === "yes") return 1;
  if (jobVisa === "unknown") return 0.65;
  return 0;
}

function seniorityMatchScore(
  title: string,
  description: string,
  profileSeniority: string | null
): number {
  if (!profileSeniority) return 0.5;
  const text = `${title} ${description}`.toLowerCase();

  const levels: Record<string, string[]> = {
    junior: ["junior", "entry", "graduate", "trainee", "praktikant", "berufseinsteiger"],
    mid: ["mid", "intermediate", "regular", "software engineer", "entwickler", "developer"],
    senior: ["senior", "lead", "principal", "staff", "architect"],
  };

  const profileLevel = profileSeniority.toLowerCase();

  for (const [level, keywords] of Object.entries(levels)) {
    if (keywords.some((kw) => text.includes(kw))) {
      if (level === profileLevel) return 1;
      const order = ["junior", "mid", "senior"];
      const diff = Math.abs(order.indexOf(level) - order.indexOf(profileLevel));
      if (diff === 1) return 0.6;
      return 0.3;
    }
  }

  return isSoftwareRole(title) ? 0.7 : 0.5;
}

function skillsMatchScore(
  job: NormalizedJob,
  profile: UserProfile
): number {
  const jobText = `${job.description} ${job.title} ${job.tags.join(" ")}`;
  const jobSkills = extractSkills(jobText);
  const dictionaryOverlap = jaccardOverlap(jobSkills, profile.skills);
  const directOverlap = profileSkillsInJobText(profile.skills, jobText);

  let score = Math.max(dictionaryOverlap, directOverlap);

  // Thin Arbeitsagentur descriptions — credit known software roles
  if (isSoftwareRole(job.title) && score < 0.4) {
    score = 0.4;
  }

  return score;
}

export function scoreJob(job: NormalizedJob, profile: UserProfile): ScoreResult {
  const skillsOverlap = skillsMatchScore(job, profile);
  const titleSimilarity = bestTitleMatch(job.title, profile.targetTitles);
  const location = locationMatchScore(job, profile);
  const visa = visaMatchScore(job.visaSponsorship, profile.visaRequired);
  const seniority = seniorityMatchScore(job.title, job.description, profile.seniority);

  const breakdown = {
    skillsOverlap: skillsOverlap * WEIGHTS.skillsOverlap,
    titleSimilarity: titleSimilarity * WEIGHTS.titleSimilarity,
    location: location * WEIGHTS.location,
    visa: visa * WEIGHTS.visa,
    seniority: seniority * WEIGHTS.seniority,
  };

  const score = Math.round(
    Object.values(breakdown).reduce((a, b) => a + b, 0)
  );

  return { score, breakdown };
}
