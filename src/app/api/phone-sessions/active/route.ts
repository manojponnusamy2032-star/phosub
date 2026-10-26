import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/server/http";
import { requireStudent } from "@/lib/supabase/server";

export async function GET() {
  try {
    const { supabase, user, profile } = await requireStudent();
    const { data, error } = await supabase.from("phone_session_students").select("session_id, phone_sessions(*)").eq("student_id", user.id);
    if (error) return NextResponse.json({ error: "Could not load active sessions." }, { status: 400 });
    const sessions = (data ?? []).map((row) => row.phone_sessions as unknown as { id: string; status: "active" | "ended"; title: string; class_group: string; classroom: string | null; mentor_id: string; started_at: string; ended_at: string | null } | null).filter((session) => Boolean(session && session.status === "active"));
    return NextResponse.json({ profile, sessions });
  } catch (error) { return errorResponse(error); }
}