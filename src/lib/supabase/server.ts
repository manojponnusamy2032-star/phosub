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

  let admin;
  try {
    admin = createSupabaseAdminClient();
  } catch {
    throw new Response("Staff authentication is not configured.", { status: 503 });
  }
  const { data: profile, error: profileError } = await admin.from("teacher_profiles").select("role, squad").eq("id", user.id).maybeSingle();
  if (profileError) throw new Response("Staff profile lookup failed.", { status: 500 });
  const authorizationError = getTeacherAuthorizationError(profile, null);
  if (authorizationError) throw new Response(authorizationError, { status: 403 });
  if (!profile) throw new Response("Teacher access required", { status: 403 });
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

  const selectColumns = "user_id, full_name, college_email, role, squad";
  const profileResult = await supabase
    .from("student_profiles")
    .select(selectColumns)
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileResult.error) {
    throw new Response("Student profile lookup failed.", { status: 500 });
  }
  if (profileResult.data) return { supabase, user, profile: profileResult.data };

  const email = String(user.email ?? "").trim().toLowerCase();
  if (!email) throw new Response("Student profile required", { status: 403 });

  let admin;
  try {
    admin = createSupabaseAdminClient();
  } catch {
    throw new Response("Student profile required", { status: 403 });
  }

  const teacherResult = await admin
    .from("teacher_profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (teacherResult.data) throw new Response("Student profile required", { status: 403 });

  const existingEmailResult = await admin
    .from("student_profiles")
    .select(selectColumns)
    .ilike("college_email", email.replace(/[\\%_]/g, "\\$&"))
    .maybeSingle();
  if (existingEmailResult.error) {
    throw new Response("Student profile lookup failed.", { status: 500 });
  }
  if (existingEmailResult.data) {
    const existingProfile = existingEmailResult.data as { user_id: string; full_name: string; college_email: string; squad?: string | null; role?: string | null };
    if (existingProfile.user_id === user.id) return { supabase, user, profile: existingProfile };

    const repairedResult = await admin
      .from("student_profiles")
      .update({ user_id: user.id, full_name: existingProfile.full_name, college_email: email, squad: existingProfile.squad ?? null, role: existingProfile.role ?? "student" })
      .eq("college_email", email)
      .select(selectColumns)
      .single();

    if (repairedResult.error || !repairedResult.data) {
      throw new Response("Student profile could not be repaired.", { status: 500 });
    }
    return { supabase, user, profile: repairedResult.data };
  }

  // The account is definitely not a mentor/admin and no valid student row exists yet.
  // We do not create a null-squad profile here; the student must be provisioned through the
  // trusted signup flow or by an authorized mentor with an explicit squad assignment.
  throw new Response("Student profile required", { status: 403 });
}