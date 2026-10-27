import { NextResponse } from "next/server";
import { phoneStatusSchema } from "@/lib/validation";
import { errorResponse } from "@/lib/server/http";
import { requireStudent } from "@/lib/supabase/server";

export async function POST(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const { supabase, profile } = await requireStudent();
    const { sessionId } = await params;
    const parsed = phoneStatusSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid phone status", issues: parsed.error.flatten() }, { status: 400 });
    const { data: session, error: sessionError } = await supabase
      .from("phone_sessions")
      .select("class_group, status")
      .eq("id", sessionId)
      .maybeSingle();
    if (sessionError || !session) return NextResponse.json({ error: "Phone session not found." }, { status: 404 });
    const studentSquad = (profile as { squad?: string | null } | null)?.squad;
    if (!studentSquad || studentSquad !== session.class_group) return NextResponse.json({ error: "This session is not available for your squad." }, { status: 403 });
    if (session.status !== "active") return NextResponse.json({ error: "Session is not active." }, { status: 409 });
    const { data, error } = await supabase.rpc("transition_phone_status", { p_session_id: sessionId, p_new_status: parsed.data.status, p_reason: parsed.data.reason ?? null, p_request_id: parsed.data.requestId ?? crypto.randomUUID() });
    if (error || !data) return NextResponse.json({ error: error?.message ?? "Status change was rejected." }, { status: 409 });
    return NextResponse.json(data);
  } catch (error) { return errorResponse(error); }
}