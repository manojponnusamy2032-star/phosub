import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse } from "@/lib/server/http";
import { requireMentor } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const studentSchema = z.object({
  full_name: z.string().trim().min(2),
  college_email: z.string().trim().email(),
  password: z.string().min(8),
});

async function findAuthUserByEmail(admin: ReturnType<typeof createSupabaseAdminClient>, email: string) {
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return { user: null, error };
    const user = data.users.find((candidate) => candidate.email?.trim().toLowerCase() === email);
    if (user) return { user, error: null };
    if (data.users.length < 1000) return { user: null, error: null };
  }
}

export async function GET() {
  try {
    await requireMentor();
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.from("student_profiles").select("user_id, full_name, college_email, created_at").order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: "Could not load students." }, { status: 400 });
    return NextResponse.json(data ?? []);
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const { profile: mentorProfile } = await requireMentor();
    const mentorSquad = (mentorProfile as { squad?: string | null } | null)?.squad ?? null;
    const parsed = studentSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid student details", issues: parsed.error.flatten() }, { status: 400 });
    if (!mentorSquad) return NextResponse.json({ error: "Assign a squad to your mentor account before provisioning students." }, { status: 403 });
    const email = parsed.data.college_email.trim().toLowerCase();
    const admin = createSupabaseAdminClient();
    const emailPattern = email.replace(/[\\%_]/g, "\\$&");
    const { data: matchingProfiles, error: profileLookupError } = await admin
      .from("student_profiles")
      .select("user_id, college_email")
      .ilike("college_email", emailPattern)
      .limit(10);
    if (profileLookupError) return NextResponse.json({ error: "Could not verify the student profile." }, { status: 500 });
    if ((matchingProfiles ?? []).some((profile) => profile.college_email.trim().toLowerCase() === email)) {
      return NextResponse.json({ error: "A student profile already uses this email. Ask an administrator to repair it." }, { status: 409 });
    }
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: { full_name: parsed.data.full_name },
    });
    let studentUser = created?.user ?? null;
    let linkedExisting = false;
    if (!studentUser && createError) {
      const existing = await findAuthUserByEmail(admin, email);
      if (existing.error) return NextResponse.json({ error: "Could not verify the existing account." }, { status: 500 });
      studentUser = existing.user;
      linkedExisting = Boolean(studentUser);
    }
    if (!studentUser) return NextResponse.json({ error: createError?.message ?? "Could not create student account." }, { status: 400 });

    const { data: teacherProfile, error: teacherLookupError } = await admin
      .from("teacher_profiles")
      .select("id")
      .eq("id", studentUser.id)
      .maybeSingle();
    if (teacherLookupError) return NextResponse.json({ error: "Could not verify the account role." }, { status: 500 });
    if (teacherProfile) return NextResponse.json({ error: "This email belongs to a mentor account." }, { status: 409 });

    const { data: existingStudent, error: studentLookupError } = await admin
      .from("student_profiles")
      .select("user_id")
      .eq("user_id", studentUser.id)
      .maybeSingle();
    if (studentLookupError) return NextResponse.json({ error: "Could not verify the student profile." }, { status: 500 });
    if (existingStudent) return NextResponse.json({ error: "This account already has a student profile." }, { status: 409 });

    const { error: profileError } = await admin.from("student_profiles").insert({
      user_id: studentUser.id,
      full_name: parsed.data.full_name,
      college_email: email,
      squad: mentorSquad,
    });
    if (profileError) {
      if (!linkedExisting) await admin.auth.admin.deleteUser(studentUser.id).catch(() => undefined);
      return NextResponse.json({ error: profileError.message ?? "Could not create student profile." }, { status: 400 });
    }
    return NextResponse.json({ id: studentUser.id, email, full_name: parsed.data.full_name, squad: mentorSquad, linkedExisting }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}