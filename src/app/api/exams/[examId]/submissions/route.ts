import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/server/http";
import { requireTeacher } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ examId: string }> }) {
  try {
    const { supabase } = await requireTeacher();
    const { examId } = await params;
    const { data, error } = await supabase.from("submissions").select("id, student_id, student_name, college_email, photo_status, missing_photo_reason, submitted_at, reference_number").eq("exam_id", examId).order("submitted_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    const submissions = (data ?? []).map((item) => ({ id: item.id, studentId: item.student_id ?? "", name: item.student_name, email: item.college_email, formStatus: "submitted" as const, photoStatus: item.photo_status, reason: item.missing_photo_reason ?? undefined, submittedAt: item.submitted_at }));
    const { data: exam } = await supabase.from("exams").select("expected_count").eq("id", examId).single();
    const photosSubmitted = submissions.filter((item) => item.photoStatus === "submitted").length;
    return NextResponse.json({ summary: { expected: exam?.expected_count ?? 0, submitted: submissions.length, pending: Math.max((exam?.expected_count ?? 0) - submissions.length, 0), photosSubmitted, photosMissing: submissions.length - photosSubmitted }, submissions });
  } catch (error) { return errorResponse(error); }
}