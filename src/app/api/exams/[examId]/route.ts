import { NextResponse } from "next/server";
import { errorResponse, examResponse } from "@/lib/server/http";
import { requireTeacher } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ examId: string }> }) {
  try {
    const { supabase } = await requireTeacher();
    const { examId } = await params;
    const { data, error } = await supabase.from("exams").select("*").eq("id", examId).single();
    if (error || !data) return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    return NextResponse.json(examResponse(data));
  } catch (error) { return errorResponse(error); }
}