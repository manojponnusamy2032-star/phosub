import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { errorResponse } from "@/lib/server/http";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");

export async function GET(_request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const admin = createSupabaseAdminClient();
    const { sessionId } = await params;
    const { data, error } = await admin.from("exam_sessions").select("id, exam_id, exams(id, title, class_name, end_time, status, student_id_required)").eq("public_token_hash", hash(sessionId)).single();
    const exam = data?.exams as unknown as { id: string; title: string; class_name: string; end_time: string; status: "scheduled" | "active" | "closed"; student_id_required: boolean } | null;
    if (error || !data || !exam) return NextResponse.json({ error: "Invalid or expired session." }, { status: 404 });
    if (exam.status === "active" && new Date(exam.end_time).getTime() <= Date.now()) return NextResponse.json({ error: "This session has expired." }, { status: 410 });
    return NextResponse.json({ exam: { id: exam.id, title: exam.title, className: exam.class_name, endTime: exam.end_time, status: exam.status }, studentIdRequired: exam.student_id_required, acceptedImageTypes: ["image/jpeg", "image/png", "image/webp"], maxUploadBytes: 5 * 1024 * 1024 });
  } catch (error) { return errorResponse(error); }
}