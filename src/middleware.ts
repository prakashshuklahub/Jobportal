import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE,
  getAppPassword,
  isPasswordProtectionEnabled,
  verifyAuthToken,
} from "@/lib/auth";
import { isConfiguredEnv } from "@/lib/env";

const PUBLIC_PATHS = ["/login", "/api/auth/login"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

function hasCronAccess(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!isConfiguredEnv(cronSecret)) return false;
  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${cronSecret}`;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico)$/)
  ) {
    return NextResponse.next();
  }

  if (!isPasswordProtectionEnabled()) {
    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Vercel cron can hit jobs-fetch with CRON_SECRET without app password
  if (pathname === "/api/cron/jobs-fetch" && hasCronAccess(request)) {
    return NextResponse.next();
  }

  const password = getAppPassword()!;
  const token = request.cookies.get(AUTH_COOKIE)?.value;

  if (await verifyAuthToken(password, token)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
