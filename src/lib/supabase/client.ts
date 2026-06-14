import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicKey, getSupabaseUrl } from "./env";

export const supabase = createClient(getSupabaseUrl(), getSupabasePublicKey());
