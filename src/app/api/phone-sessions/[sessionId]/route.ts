import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/server/http";
import { requireMentor, requireStudent } from "@/lib/supabase/server";
import { phoneSessionResponse } from "@/lib/server/phone";

export async function GET(_request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await params;
    try {
      const { supabase } = await requireMentor();
      const { data: session, error: sessionError } = await supabase.from("phone_sessions").select("*").eq("id", sessionId).single();
      if (sessionError) {
        console.error("Failed to load phone session", { sessionId, error: sessionError });
        return NextResponse.json({ error: "Could not load phone session." }, { status: 500 });
      }
      if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from("phone_session_students")
        .select("student_id, student_profiles(full_name, college_email)")
        .eq("session_id", sessionId);
      if (enrollmentsError) {
        console.error("Failed to load phone session enrollment", { sessionId, error: enrollmentsError });
        return NextResponse.json({ error: "Could not load session enrollment." }, { status: 500 });
      }
      const { data: statusRows, error: statusRowsError } = await supabase
        .from("phone_statuses")
        .select("student_id, current_status, current_reason, updated_at")
        .eq("session_id", sessionId);
      if (statusRowsError) {
        console.error("Failed to load phone statuses", { sessionId, error: statusRowsError });
        return NextResponse.json({ error: "Could not load phone statuses." }, { status: 500 });
      }
      const statusMap = new Map((statusRows ?? []).map((r) => [r.student_id, r]));
      const statuses = (enrollments ?? []).map((row) => {
        const profile = row.student_profiles as unknown as { full_name: string; college_email: string } | null;
        const st = statusMap.get(row.student_id);
        return { studentId: row.student_id, name: profile?.full_name ?? "", email: profile?.college_email ?? "", status: st?.current_status ?? "not_reported", reason: st?.current_reason ?? undefined, updatedAt: st?.updated_at ?? session.started_at };
      });
      const { count, error: countError } = await supabase
        .from("phone_session_students")
        .select("student_id", { count: "exact", head: true })
        .eq("session_id", sessionId);
      if (countError) {
        console.error("Failed to count phone session enrollment", { sessionId, error: countError });
        return NextResponse.json({ error: "Could not count session enrollment." }, { status: 500 });
      }
      const result = phoneSessionResponse(session, statuses);
      result.totalEligible = count ?? result.totalEligible;
      result.notReported = Math.max(result.totalEligible - result.submitted - result.notSubmitted - result.takenBack, 0);
      return NextResponse.json({ session: result, students: statuses });
    } catch (mentorError) {
      if (!(mentorError instanceof Response)) throw mentorError;
      const { supabase, user } = await requireStudent();
      const { data: session, error } = await supabase.from("phone_sessions").select("*").eq("id", sessionId).eq("status", "active").single();
      if (error || !session) return NextResponse.json({ error: "Active session not found" }, { status: 404 });
      const { data: enrollment } = await supabase.from("phone_session_students").select("student_id").eq("session_id", sessionId).eq("student_id", user.id).single();
      if (!enrollment) return NextResponse.json({ error: "You are not eligible for this session" }, { status: 403 });
      const { data: status } = await supabase.from("phone_statuses").select("current_status, current_reason, updated_at").eq("session_id", sessionId).eq("student_id", user.id).maybeSingle();
      return NextResponse.json({ session: phoneSessionResponse(session, [{ studentId: user.id, name: "", email: "", status: status?.current_status ?? "not_reported", reason: status?.current_reason ?? undefined, updatedAt: status?.updated_at }]), status: status ?? { current_status: "not_reported" } });
    }
  } catch (error) { return errorResponse(error); }
}
