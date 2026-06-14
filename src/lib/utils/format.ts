export function formatRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function formatSalary(
  min: number | null,
  max: number | null,
  currency: string | null
): string {
  if (!min && !max) return "Not disclosed";
  const cur = currency ?? "EUR";
  if (min && max) return `${formatNumber(min)} – ${formatNumber(max)} ${cur}`;
  if (min) return `From ${formatNumber(min)} ${cur}`;
  if (max) return `Up to ${formatNumber(max)} ${cur}`;
  return "Not disclosed";
}

function formatNumber(n: number): string {
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return String(n);
}

export const SOURCE_LABELS: Record<string, { name: string; color: string }> = {
  arbeitnow: { name: "Arbeitnow", color: "bg-blue-100 text-blue-800" },
  arbeitsagentur: { name: "Arbeitsagentur", color: "bg-green-100 text-green-800" },
  linkedin: { name: "LinkedIn", color: "bg-sky-100 text-sky-800" },
  stepstone: { name: "StepStone", color: "bg-orange-100 text-orange-800" },
  germantechjobs: { name: "GermanTechJobs", color: "bg-purple-100 text-purple-800" },
  wellfound: { name: "Wellfound", color: "bg-pink-100 text-pink-800" },
  indeed: { name: "Indeed", color: "bg-indigo-100 text-indigo-800" },
  xing: { name: "XING", color: "bg-teal-100 text-teal-800" },
};

export function getMatchColor(score: number): string {
  if (score >= 85) return "bg-green-500";
  if (score >= 70) return "bg-blue-500";
  return "bg-yellow-500";
}
