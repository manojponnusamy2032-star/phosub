import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { errorResponse } from "@/lib/server/http";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const payloadSchema = z.object({ fullName: z.string().trim().min(2), collegeEmail: z.string().trim().email(), studentId: z.string().trim().optional(), photoStatus: z.enum(["submitted", "not_submitted"]), photoPath: z.string().trim().optional(), reason: z.string().trim().optional() }).superRefine((value, context) => {
  if (value.photoStatus === "submitted" && !value.photoPath) context.addIssue({ code: "custom", path: ["photoPath"], message: "A verified photo upload is required." });
  if (value.photoStatus === "not_submitted" && !value.reason) context.addIssue({ code: "custom", path: ["reason"], message: "A reason is required." });
});

export async function POST(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const admin = createSupabaseAdminClient();
    const { sessionId } = await params;
    const parsed = payloadSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid submission", issues: parsed.error.flatten() }, { status: 400 });
    const { data: session, error: sessionError } = await admin.from("exam_sessions").select("id, exam_id, exams(title, end_time, status, student_id_required)").eq("public_token_hash", hash(sessionId)).single();
    const exam = session?.exams as unknown as { title: string; end_time: string; status: "scheduled" | "active" | "closed"; student_id_required: boolean } | null;
    if (sessionError || !session || !exam) return NextResponse.json({ error: "Invalid or expired session." }, { status: 404 });
    if (exam.status !== "active") return NextResponse.json({ error: "This session is not accepting submissions." }, { status: 409 });
    if (new Date(exam.end_time).getTime() <= Date.now()) return NextResponse.json({ error: "This session has expired." }, { status: 410 });
    if (exam.student_id_required && !parsed.data.studentId) return NextResponse.json({ error: "Student ID is required for this exam." }, { status: 400 });
    if (parsed.data.photoPath && !parsed.data.photoPath.startsWith(`sessions/${session.id}/`)) return NextResponse.json({ error: "Photo upload does not belong to this session." }, { status: 400 });
    if (parsed.data.photoStatus === "submitted" && parsed.data.photoPath) {
      const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "exam-photos";
      const pathParts = parsed.data.photoPath.split("/");
      const fileName = pathParts.at(-1);
      const { data: objects, error: objectError } = await admin.storage.from(bucket).list(`sessions/${session.id}`, { search: fileName });
      if (objectError || !objects?.some((object) => object.name === fileName)) return NextResponse.json({ error: "Photo upload could not be verified." }, { status: 400 });
    }
    const { data, error } = await admin.from("submissions").insert({ exam_id: session.exam_id, session_id: session.id, student_id: parsed.data.studentId || null, student_name: parsed.data.fullName, college_email: parsed.data.collegeEmail.toLowerCase(), photo_status: parsed.data.photoStatus, photo_path: parsed.data.photoPath ?? null, missing_photo_reason: parsed.data.reason ?? null }).select("reference_number, submitted_at, exams(title)").single();
    if (error) {
      if (error.code === "23505") return NextResponse.json({ error: "A submission already exists for this student." }, { status: 409 });
      return NextResponse.json({ error: "Submission could not be saved." }, { status: 400 });
    }
    const resultExam = data?.exams as unknown as { title: string } | null;
    return NextResponse.json({ referenceNumber: data?.reference_number, submittedAt: data?.submitted_at, examTitle: resultExam?.title ?? exam.title }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}