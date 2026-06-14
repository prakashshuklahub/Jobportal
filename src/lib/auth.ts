import { isConfiguredEnv } from "./env";

export const AUTH_COOKIE = "ma-auth";
const AUTH_SALT = "mission-abroad-session-v1";
const encoder = new TextEncoder();

export function isPasswordProtectionEnabled(): boolean {
  return isConfiguredEnv(process.env.APP_PASSWORD);
}

export function getAppPassword(): string | null {
  const password = process.env.APP_PASSWORD;
  return isConfiguredEnv(password) ? password!.trim() : null;
}

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256Hex(key: string, message: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    encoder.encode(message)
  );
  return bufferToHex(signature);
}

/** Edge-compatible — uses Web Crypto API (works in middleware + Node). */
export async function createAuthToken(password: string): Promise<string> {
  return hmacSha256Hex(password, AUTH_SALT);
}

export async function verifyAuthToken(
  password: string,
  token: string | undefined
): Promise<boolean> {
  if (!token) return false;
  const expected = await createAuthToken(password);
  return timingSafeEqualStr(token, expected);
}

export function verifyPassword(input: string): boolean {
  const password = getAppPassword();
  if (!password) return false;
  return timingSafeEqualStr(input.trim(), password);
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
