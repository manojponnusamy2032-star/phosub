import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/server/http";
import { requireMentor } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const { supabase } = await requireMentor();
    const { sessionId } = await params;

    const { data: session, error: sessionError } = await supabase.from("phone_sessions").select("*").eq("id", sessionId).single();
    if (sessionError || !session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    const { data: enrollments } = await supabase.from("phone_session_students").select("student_id, student_profiles(full_name, college_email)").eq("session_id", sessionId);
    const { data: statusRows } = await supabase.from("phone_statuses").select("student_id, current_status, current_reason, updated_at").eq("session_id", sessionId);
    const { data: events } = await supabase.from("phone_status_events").select("id, student_id, event_type, previous_status, new_status, reason, created_at, student_profiles(full_name)").eq("session_id", sessionId).order("created_at", { ascending: true });

    const statusMap = new Map((statusRows ?? []).map((row) => [row.student_id, row]));
    const students = (enrollments ?? []).map((row) => {
      const profile = row.student_profiles as unknown as { full_name: string; college_email: string } | null;
      const st = statusMap.get(row.student_id);
      return {
        studentId: row.student_id,
        name: profile?.full_name ?? "",
        email: profile?.college_email ?? "",
        status: st?.current_status ?? "not_reported",
        reason: st?.current_reason ?? undefined,
        updatedAt: st?.updated_at ?? session.started_at,
      };
    });

    const report = {
      session: {
        id: session.id,
        title: session.title,
        classGroup: session.class_group,
        classroom: session.classroom ?? undefined,
        status: session.status,
        startedAt: session.started_at,
        endedAt: session.ended_at ?? undefined,
      },
      counts: {
        total: students.length,
        submitted: students.filter((s) => s.status === "submitted").length,
        notSubmitted: students.filter((s) => s.status === "not_submitted").length,
        takenBack: students.filter((s) => s.status === "taken_back").length,
        notReported: students.filter((s) => s.status === "not_reported").length,
      },
      students,
      events: (events ?? []).map((event) => {
        const profile = event.student_profiles as unknown as { full_name: string } | null;
        return {
          id: event.id,
          studentId: event.student_id,
          studentName: profile?.full_name ?? "",
          eventType: event.event_type,
          previousStatus: event.previous_status ?? undefined,
          newStatus: event.new_status,
          reason: event.reason ?? undefined,
          createdAt: event.created_at,
        };
      }),
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(report);
  } catch (error) { return errorResponse(error); }
}
