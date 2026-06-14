import { NextRequest, NextResponse } from "next/server";

// Future: import { getJobById } from "@/lib/jobs/db";
// Future: import { getUserProfile } from "@/lib/jobs/profile";
// Future: import { generateCoverLetter } from "@/lib/llm/gemini";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  void params;

  // Future feature — cover letter generation via Gemini API.
  // Uncomment the block below and set GEMINI_API_KEY to enable.
  return NextResponse.json(
    { error: "Cover letter generation is not enabled yet (coming soon)" },
    { status: 501 }
  );

  /*
  try {
    const { id } = await params;
    const job = await getJobById(id);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json({ error: "No profile configured" }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY not configured" },
        { status: 503 }
      );
    }

    const content = await generateCoverLetter(
      job.title,
      job.company,
      job.description,
      profile.resumeText ?? "",
      profile.skills
    );

    return NextResponse.json({ content });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
  */
}
