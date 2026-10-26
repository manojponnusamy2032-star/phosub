import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/server/http";
import { requireMentor } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const { supabase } = await requireMentor();
    const { sessionId } = await params;
    const { data, error } = await supabase.from("phone_status_events").select("id, student_id, event_type, previous_status, new_status, reason, created_at, student_profiles(full_name)").eq("session_id", sessionId).order("created_at", { ascending: true });
    if (error) return NextResponse.json({ error: "Could not load status history." }, { status: 400 });
    return NextResponse.json((data ?? []).map((event) => { const profile = event.student_profiles as unknown as { full_name: string } | null; return { id: event.id, studentId: event.student_id, studentName: profile?.full_name ?? "", eventType: event.event_type, previousStatus: event.previous_status, newStatus: event.new_status, reason: event.reason ?? undefined, createdAt: event.created_at }; }));
  } catch (error) { return errorResponse(error); }
}