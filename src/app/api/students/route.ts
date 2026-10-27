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
    const admin = createSupabaseAdminClient();
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: parsed.data.college_email,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: { full_name: parsed.data.full_name },
    });
    if (createError || !created.user) return NextResponse.json({ error: createError?.message ?? "Could not create student account." }, { status: 400 });
    const { error: profileError } = await admin.from("student_profiles").insert({
      user_id: created.user.id,
      full_name: parsed.data.full_name,
      college_email: parsed.data.college_email,
      squad: mentorSquad,
    });
    if (profileError) {
      await admin.auth.admin.deleteUser(created.user.id).catch(() => undefined);
      return NextResponse.json({ error: profileError.message ?? "Could not create student profile." }, { status: 400 });
    }
    return NextResponse.json({ id: created.user.id, email: parsed.data.college_email, full_name: parsed.data.full_name, squad: mentorSquad }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}