import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE,
  getAuthCookieOptions,
  isPasswordProtectionEnabled,
  verifyPassword,
  createAuthToken,
  getAppPassword,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  if (!isPasswordProtectionEnabled()) {
    return NextResponse.json(
      { error: "APP_PASSWORD is not configured" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const password = typeof body.password === "string" ? body.password : "";

    if (!verifyPassword(password)) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    const token = createAuthToken(getAppPassword()!);
    response.cookies.set(AUTH_COOKIE, token, getAuthCookieOptions());
    return response;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
