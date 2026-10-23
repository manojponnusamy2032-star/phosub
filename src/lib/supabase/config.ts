export function hasSupabasePublicConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && key && !url.includes("your-project.supabase.co") && key !== "your-anon-key");
}

export function hasSupabaseAdminConfig() {
  return hasSupabasePublicConfig() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY !== "server-only-service-role-key");
}