import { NextResponse } from "next/server";
import { errorResponse, examResponse } from "@/lib/server/http";
import { requireTeacher } from "@/lib/supabase/server";

export async function POST(_request: Request, { params }: { params: Promise<{ examId: string }> }) {
  try {
    const { supabase } = await requireTeacher();
    const { examId } = await params;
    const { data, error } = await supabase.from("exams").update({ status: "closed" }).eq("id", examId).eq("status", "active").select().single();
    if (error || !data) return NextResponse.json({ error: "Only active exams can be closed." }, { status: 409 });
    await supabase.from("exam_sessions").update({ closed_at: new Date().toISOString() }).eq("exam_id", examId).is("closed_at", null);
    return NextResponse.json(examResponse(data));
  } catch (error) { return errorResponse(error); }
}