import { createClient } from "@supabase/supabase-js";
import { hasSupabaseAdminConfig } from "./config";

export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!hasSupabaseAdminConfig() || !url || !key) throw new Error("Supabase service role is not configured.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}