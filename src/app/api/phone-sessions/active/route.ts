import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/server/http";
import { requireStudent } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type SessionRow = { id: string; title: string; class_group: string; classroom: string | null; status: string; started_at: string };

export async function GET() {
  try {
    const { user, profile } = await requireStudent();
    const studentProfile = profile as { full_name?: string; college_email?: string; squad?: string | null } | null;
    const squad = studentProfile?.squad ?? null;
    if (!squad) throw new Response("Student squad required", { status: 403 });

    const admin = createSupabaseAdminClient();

    const { data: enrollments, error: enrollError } = await admin
      .from("phone_session_students")
      .select("session_id")
      .eq("student_id", user.id);
    if (enrollError) return NextResponse.json({ error: "Could not load active sessions." }, { status: 400 });

    const sessionIds = (enrollments ?? []).map((row) => row.session_id);
    let sessions: SessionRow[] = [];
    if (sessionIds.length) {
      const { data, error } = await admin
        .from("phone_sessions")
        .select("*")
        .in("id", sessionIds)
        .eq("class_group", squad)
        .eq("status", "active")
        .order("started_at", { ascending: false });
      if (error) return NextResponse.json({ error: "Could not load active sessions." }, { status: 400 });
      sessions = (data ?? []) as SessionRow[];
    }

    return NextResponse.json({ profile, sessions });
  } catch (error) { return errorResponse(error); }
}
