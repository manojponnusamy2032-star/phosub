import { NextResponse } from "next/server";
import { phoneSessionSchema } from "@/lib/validation";
import { errorResponse } from "@/lib/server/http";
import { requireMentor } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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
    const { supabase, user } = await requireMentor();
    const parsed = phoneSessionSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid session details", issues: parsed.error.flatten() }, { status: 400 });
    const { data: session, error } = await supabase.from("phone_sessions").insert({ mentor_id: user.id, title: parsed.data.title, class_group: parsed.data.classGroup, classroom: parsed.data.classroom || null }).select().single();
    if (error || !session) return NextResponse.json({ error: error?.code === "23505" ? "An active session already exists for this group." : "Could not start phone session." }, { status: 409 });
    const admin = createSupabaseAdminClient();
    const studentQuery = parsed.data.studentIds?.length ? admin.from("student_profiles").select("user_id").in("user_id", parsed.data.studentIds) : admin.from("student_profiles").select("user_id");
    const { data: students } = await studentQuery;
    if (students?.length) await admin.from("phone_session_students").insert(students.map((student) => ({ session_id: session.id, student_id: student.user_id })));
    return NextResponse.json(session, { status: 201 });
  } catch (error) { return errorResponse(error); }
}