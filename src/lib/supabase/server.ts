import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { hasSupabasePublicConfig } from "./config";

export function getTeacherAuthorizationError(profile: { role?: unknown } | null, profileError: unknown): string | null {
  if (profileError || !profile) return "Teacher access required";
  if (!isMentorRole(profile.role)) return "Teacher access required";
  return null;
}

export function isMentorRole(role: unknown): role is "mentor" | "teacher" | "admin" {
  return role === "mentor" || role === "teacher" || role === "admin";
}

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
  const authorizationError = getTeacherAuthorizationError(profile, profileError);
  if (authorizationError) throw new Response(authorizationError, { status: 403 });
  return { supabase, user, profile };
}

export async function requireMentor() {
  const result = await requireTeacher();
  if (!result.profile || !isMentorRole(result.profile.role)) throw new Response("Mentor access required", { status: 403 });
  return result;
}

export async function requireStudent() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Response("Authentication required", { status: 401 });
  const { data: profile, error: profileError } = await supabase.from("student_profiles").select("user_id, full_name, college_email").eq("user_id", user.id).single();
  if (profileError || !profile) throw new Response("Student profile required", { status: 403 });
  return { supabase, user, profile };
}