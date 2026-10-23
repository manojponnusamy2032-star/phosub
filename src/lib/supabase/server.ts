import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { hasSupabasePublicConfig } from "./config";

export async function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!hasSupabasePublicConfig() || !url || !key) throw new Error("Supabase is not configured.");
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (values) => values.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
    },
  });
}

export async function requireTeacher() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Response("Authentication required", { status: 401 });
  const { data: profile, error: profileError } = await supabase.from("teacher_profiles").select("role").eq("id", user.id).single();
  if (profileError || !profile || !["teacher", "admin"].includes(profile.role)) throw new Response("Teacher access required", { status: 403 });
  return { supabase, user, profile };
}