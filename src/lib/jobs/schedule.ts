const BERLIN_TZ = "Europe/Berlin";

export function isFetchDay(date: Date = new Date()): boolean {
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: BERLIN_TZ,
    weekday: "short",
  }).format(date);

  // Tue–Sat only; skip Sun/Mon
  return !["Sun", "Mon"].includes(day);
}

export function getBerlinDayName(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: BERLIN_TZ,
    weekday: "long",
  }).format(date);
}

export function getNextFetchDayMessage(): string {
  const now = new Date();
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: BERLIN_TZ,
    weekday: "short",
  }).format(now);

  if (day === "Sun" || day === "Mon") {
    return "No new jobs today — next refresh on Tuesday.";
  }
  return "";
}
