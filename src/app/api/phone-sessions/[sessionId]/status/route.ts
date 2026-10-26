import { NextResponse } from "next/server";
import { phoneStatusSchema } from "@/lib/validation";
import { errorResponse } from "@/lib/server/http";
import { requireStudent } from "@/lib/supabase/server";

export async function POST(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const { supabase } = await requireStudent();
    const { sessionId } = await params;
    const parsed = phoneStatusSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid phone status", issues: parsed.error.flatten() }, { status: 400 });
    const { data, error } = await supabase.rpc("transition_phone_status", { p_session_id: sessionId, p_new_status: parsed.data.status, p_reason: parsed.data.reason ?? null, p_request_id: parsed.data.requestId ?? crypto.randomUUID() });
    if (error || !data) return NextResponse.json({ error: error?.message ?? "Status change was rejected." }, { status: 409 });
    return NextResponse.json(data);
  } catch (error) { return errorResponse(error); }
}