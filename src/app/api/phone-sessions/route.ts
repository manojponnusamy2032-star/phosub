import { NextResponse } from "next/server";
import { phoneSessionSchema } from "@/lib/validation";
import { errorResponse } from "@/lib/server/http";
import { requireMentor } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ALLOWED_SQUADS } from "@/lib/squads";

const SQUAD_SET = new Set<string>(ALLOWED_SQUADS);

export async function GET() {
  try {
    const { supabase, user } = await requireMentor();
    const { data, error } = await supabase.from("phone_sessions").select("*").eq("mentor_id", user.id).order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: "Could not load phone sessions." }, { status: 400 });
    return NextResponse.json(data ?? []);
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const { supabase, user, profile } = await requireMentor();
    const parsed = phoneSessionSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid session details", issues: parsed.error.flatten() }, { status: 400 });
    const { title, classGroup, classroom, studentIds } = parsed.data;

    if (!SQUAD_SET.has(classGroup)) {
      return NextResponse.json({ error: "Invalid squad." }, { status: 400 });
    }

    const mentorProfile = profile as { squad?: string | null } | null;
    if (mentorProfile?.squad && mentorProfile.squad !== classGroup) {
      return NextResponse.json({ error: "You are not authorized to manage this squad." }, { status: 403 });
    }

    const uniqueStudentIds = studentIds ? [...new Set(studentIds)] : undefined;
    const admin = createSupabaseAdminClient();

    // Resolve eligible students first, before creating the session.
    let studentQuery = admin.from("student_profiles").select("user_id").eq("squad", classGroup);
    if (uniqueStudentIds?.length) studentQuery = studentQuery.in("user_id", uniqueStudentIds);
    const { data: students, error: studentError } = await studentQuery;
    if (studentError) return NextResponse.json({ error: "Could not load students." }, { status: 400 });

    const foundIds = new Set((students ?? []).map((row) => row.user_id));
    if (uniqueStudentIds?.length) {
      const missing = uniqueStudentIds.filter((id) => !foundIds.has(id));
      if (missing.length) {
        return NextResponse.json({ error: "One or more selected students are invalid or belong to another squad." }, { status: 400 });
      }
    }

    const { data: session, error } = await supabase
      .from("phone_sessions")
      .insert({ mentor_id: user.id, title, class_group: classGroup, classroom: classroom || null })
      .select()
      .single();
    if (error || !session) {
      if (error?.code === "23505") return NextResponse.json({ error: "An active session already exists for this group." }, { status: 409 });
      return NextResponse.json({ error: "Could not start phone session." }, { status: 400 });
    }

    const enrollments = (students ?? []).map((student) => ({ session_id: session.id, student_id: student.user_id }));
    if (enrollments.length) {
      const { error: enrollError } = await admin.from("phone_session_students").insert(enrollments);
      if (enrollError) {
        // Compensate: remove the misleading active session if enrollment failed.
        await admin.from("phone_sessions").delete().eq("id", session.id);
        return NextResponse.json({ error: "Could not enroll students in this session." }, { status: 400 });
      }
    }

    return NextResponse.json(session, { status: 201 });
  } catch (error) { return errorResponse(error); }
}