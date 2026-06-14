import { createHmac, timingSafeEqual } from "crypto";
import { isConfiguredEnv } from "./env";

export const AUTH_COOKIE = "ma-auth";
const AUTH_SALT = "mission-abroad-session-v1";

export function isPasswordProtectionEnabled(): boolean {
  return isConfiguredEnv(process.env.APP_PASSWORD);
}

export function getAppPassword(): string | null {
  const password = process.env.APP_PASSWORD;
  return isConfiguredEnv(password) ? password!.trim() : null;
}

export function createAuthToken(password: string): string {
  return createHmac("sha256", password).update(AUTH_SALT).digest("hex");
}

export function verifyAuthToken(password: string, token: string | undefined): boolean {
  if (!token) return false;
  const expected = createAuthToken(password);
  try {
    return timingSafeEqual(Buffer.from(token, "utf8"), Buffer.from(expected, "utf8"));
  } catch {
    return false;
  }
}

export function verifyPassword(input: string): boolean {
  const password = getAppPassword();
  if (!password) return false;
  try {
    return timingSafeEqual(
      Buffer.from(input.trim(), "utf8"),
      Buffer.from(password, "utf8")
    );
  } catch {
    return false;
  }
}

export function getAuthCookieOptions(maxAgeSeconds = 60 * 60 * 24 * 30) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
