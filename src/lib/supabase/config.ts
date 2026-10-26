export function hasSupabasePublicConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;
  if (url.includes("your-project.supabase.co") || key === "your-anon-key") return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    if (!parsed.hostname) return false;
  } catch {
    return false;
  }
  return true;
}

export function hasSupabaseAdminConfig() {
  return hasSupabasePublicConfig() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY !== "server-only-service-role-key");
}

export function validateSupabaseUrl(url: string | undefined): { valid: boolean; reason?: string } {
  if (!url) return { valid: false, reason: "URL is missing" };
  if (url.includes("your-project.supabase.co")) return { valid: false, reason: "URL is a placeholder" };
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return { valid: false, reason: "URL must use http or https protocol" };
    if (!parsed.hostname) return { valid: false, reason: "URL is missing a hostname" };
    return { valid: true };
  } catch {
    return { valid: false, reason: "URL is not a valid URL" };
  }
}