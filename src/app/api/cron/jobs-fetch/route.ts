import { NextRequest, NextResponse } from "next/server";
import { isFetchDay } from "@/lib/jobs/schedule";
import { runAllSourcesPipeline, runSourcePipeline } from "@/lib/jobs/pipeline";
import { SOURCES } from "@/lib/jobs/sources";
import { isConfiguredEnv } from "@/lib/env";

export const maxDuration = 10;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const force = request.nextUrl.searchParams.get("force") === "true";

  // Only enforce cron auth when a real secret is configured (not a placeholder)
  if (
    isConfiguredEnv(cronSecret) &&
    authHeader !== `Bearer ${cronSecret}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Scheduled cron skips Sun/Mon; manual refresh can pass ?force=true
  if (!force && !isFetchDay()) {
    return NextResponse.json(
      {
        skipped: true,
        message: "Off-day (Sun/Mon) — use ?force=true for manual refresh",
      },
      { status: 200 }
    );
  }

  const source = request.nextUrl.searchParams.get("source");

  if (source) {
    const valid = SOURCES.some((s) => s.id === source);
    if (!valid) {
      return NextResponse.json({ error: "Invalid source" }, { status: 400 });
    }
    const result = await runSourcePipeline(source);
    return NextResponse.json({ results: [result] });
  }

  const results = await runAllSourcesPipeline();
  return NextResponse.json({ results });
}
