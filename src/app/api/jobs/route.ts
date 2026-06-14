import { NextResponse } from "next/server";
import { listJobs } from "@/lib/jobs/db";
import { getUserProfile } from "@/lib/jobs/profile";
import { isFetchDay, getNextFetchDayMessage } from "@/lib/jobs/schedule";

export async function GET() {
  try {
    const profile = await getUserProfile();
    const threshold = profile?.matchThreshold ?? 70;
    const jobs = await listJobs(threshold);

    return NextResponse.json({
      jobs,
      isFetchDay: isFetchDay(),
      offDayMessage: getNextFetchDayMessage(),
      matchThreshold: threshold,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch jobs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
