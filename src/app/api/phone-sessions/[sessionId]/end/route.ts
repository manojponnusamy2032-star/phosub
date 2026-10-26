import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/server/http";
import { requireMentor } from "@/lib/supabase/server";

export async function POST(_request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const { supabase } = await requireMentor();
    const { sessionId } = await params;
    const { data, error } = await supabase.from("phone_sessions").update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", sessionId).eq("status", "active").select().single();
    if (error || !data) return NextResponse.json({ error: "Session is already ended or unavailable." }, { status: 409 });
    return NextResponse.json(data);
  } catch (error) { return errorResponse(error); }
}