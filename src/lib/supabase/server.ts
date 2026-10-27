import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { hasSupabasePublicConfig } from "./config";
import { createSupabaseAdminClient } from "./admin";

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
  const { data: profile, error: profileError } = await supabase.from("teacher_profiles").select("role, squad").eq("id", user.id).single();
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

  const selectColumns = "user_id, full_name, college_email, squad";
  const profileQuery = supabase
    .from("student_profiles")
    .select(selectColumns)
    .eq("user_id", user.id);
  const profileResult = typeof profileQuery.maybeSingle === "function"
    ? await profileQuery.maybeSingle()
    : (typeof profileQuery.single === "function" ? await profileQuery.single() : await profileQuery);
  const profile = profileResult && Object.prototype.hasOwnProperty.call(profileResult, "data")
    ? profileResult.data
    : profileResult;
  const profileError = profileResult && Object.prototype.hasOwnProperty.call(profileResult, "error")
    ? profileResult.error
    : null;

  if (profileError) {
    throw new Response("Student profile lookup failed.", { status: 500 });
  }
  if (profile) return { supabase, user, profile };

  // Safe, idempotent provisioning for a legitimate missing student profile.
  // Uses the service-role client only on the server; never exposes it to clients.
  let admin;
  try {
    admin = createSupabaseAdminClient();
  } catch {
    throw new Response("Student profile required", { status: 403 });
  }

  // Do not auto-provision mentor/admin accounts as students.
  const teacherQuery = admin
    .from("teacher_profiles")
    .select("id")
    .eq("id", user.id);
  const teacherResult = typeof teacherQuery.maybeSingle === "function"
    ? await teacherQuery.maybeSingle()
    : (typeof teacherQuery.single === "function" ? await teacherQuery.single() : await teacherQuery);
  const teacherProfile = teacherResult && Object.prototype.hasOwnProperty.call(teacherResult, "data")
    ? teacherResult.data
    : teacherResult;
  if (teacherProfile) throw new Response("Student profile required", { status: 403 });

  const existingQuery = admin
    .from("student_profiles")
    .select(selectColumns)
    .eq("user_id", user.id);
  const existingResult = typeof existingQuery.maybeSingle === "function"
    ? await existingQuery.maybeSingle()
    : (typeof existingQuery.single === "function" ? await existingQuery.single() : await existingQuery);
  const existing = existingResult && Object.prototype.hasOwnProperty.call(existingResult, "data")
    ? existingResult.data
    : existingResult;
  if (existing) return { supabase, user, profile: existing };

  const fullName = String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email?.split("@")[0] ?? "Student").trim();
  const safeName = fullName.length >= 2 ? fullName : "Student";
  const email = String(user.email ?? "").trim().toLowerCase();
  if (!email) throw new Response("Student profile required", { status: 403 });

  const insertQuery = admin
    .from("student_profiles")
    .insert({
      user_id: user.id,
      full_name: safeName,
      college_email: email,
      squad: null,
    })
    .select(selectColumns);
  const insertResult = typeof insertQuery.single === "function"
    ? await insertQuery.single()
    : (typeof insertQuery.maybeSingle === "function" ? await insertQuery.maybeSingle() : await insertQuery);
  const inserted = insertResult && Object.prototype.hasOwnProperty.call(insertResult, "data")
    ? insertResult.data
    : insertResult;
  const insertError = insertResult && Object.prototype.hasOwnProperty.call(insertResult, "error")
    ? insertResult.error
    : null;

  if (insertError || !inserted) {
    const retryQuery = admin
      .from("student_profiles")
      .select(selectColumns)
      .eq("user_id", user.id);
    const retryResult = typeof retryQuery.maybeSingle === "function"
      ? await retryQuery.maybeSingle()
      : (typeof retryQuery.single === "function" ? await retryQuery.single() : await retryQuery);
    const retry = retryResult && Object.prototype.hasOwnProperty.call(retryResult, "data")
      ? retryResult.data
      : retryResult;
    if (retry) return { supabase, user, profile: retry };
    throw new Response("Student profile required", { status: 403 });
  }

  return { supabase, user, profile: inserted };
}