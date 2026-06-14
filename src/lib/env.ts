const PLACEHOLDER_VALUES = new Set([
  "your-apify-token",
  "your-random-secret",
  "your-service-role-key",
  "your-gemini-api-key",
  "your-anon-key",
  "your-app-password",
]);

/** True only when the env var is set to a real value (not empty or a template placeholder). */
export function isConfiguredEnv(value: string | undefined): boolean {
  if (!value?.trim()) return false;
  const normalized = value.trim().toLowerCase();
  if (PLACEHOLDER_VALUES.has(normalized)) return false;
  if (normalized.startsWith("your-")) return false;
  return true;
}
