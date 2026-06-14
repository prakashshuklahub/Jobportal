export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function computeDedupeHash(
  title: string,
  company: string,
  location: string | null
): string {
  const parts = [
    normalizeText(title),
    normalizeText(company),
    normalizeText(location ?? ""),
  ];
  return parts.join("|");
}
