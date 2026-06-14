import { getSupabaseAdmin } from "@/lib/supabase/admin";

export function isMissingTableError(message: string): boolean {
  return (
    message.includes("Could not find the table") ||
    message.includes("PGRST205") ||
    message.includes("relation") && message.includes("does not exist")
  );
}

export async function getDatabaseSetupError(): Promise<string | null> {
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("user_profile").select("id").limit(1);
    if (!error) return null;
    if (isMissingTableError(error.message)) {
      return "Database tables not found. Run supabase/setup.sql in your Supabase SQL Editor.";
    }
    return error.message;
  } catch (err) {
    return err instanceof Error ? err.message : "Database connection failed";
  }
}
