import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/server/http";
import { requireMentor, requireStudent } from "@/lib/supabase/server";
import { phoneSessionResponse } from "@/lib/server/phone";

export async function GET(_request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await params;
    try {
      const { supabase } = await requireMentor();
      const { data: session, error } = await supabase.from("phone_sessions").select("*").eq("id", sessionId).single();
      if (error || !session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
      const { data: rows } = await supabase.from("phone_statuses").select("student_id, current_status, current_reason, updated_at, student_profiles(full_name, college_email)").eq("session_id", sessionId);
      const statuses = (rows ?? []).map((row) => { const profile = row.student_profiles as unknown as { full_name: string; college_email: string } | null; return { studentId: row.student_id, name: profile?.full_name ?? "", email: profile?.college_email ?? "", status: row.current_status, reason: row.current_reason ?? undefined, updatedAt: row.updated_at }; });
      const { count } = await supabase.from("phone_session_students").select("student_id", { count: "exact", head: true }).eq("session_id", sessionId);
      const result = phoneSessionResponse(session, statuses); result.totalEligible = count ?? result.totalEligible; result.notReported = Math.max(result.totalEligible - result.submitted - result.notSubmitted - result.takenBack, 0); return NextResponse.json({ session: result, students: statuses });
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