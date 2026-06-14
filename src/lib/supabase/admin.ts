import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServerKey, getSupabaseUrl } from "./env";

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!adminClient) {
    adminClient = createClient(getSupabaseUrl(), getSupabaseServerKey());
  }
  return adminClient;
}
