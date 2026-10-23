import { NextResponse } from "next/server";
import { randomBytes, createHash } from "node:crypto";
import { errorResponse, examResponse } from "@/lib/server/http";
import { requireTeacher } from "@/lib/supabase/server";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");

export async function POST(_request: Request, { params }: { params: Promise<{ examId: string }> }) {
  try {
    const { supabase } = await requireTeacher();
    const { examId } = await params;
    const { data: exam, error: examError } = await supabase.from("exams").select("*").eq("id", examId).single();
    if (examError || !exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    if (exam.status !== "closed") return NextResponse.json({ error: "Only closed exams can be reopened." }, { status: 409 });
    const token = randomBytes(32).toString("base64url");
    const { error: sessionError } = await supabase.from("exam_sessions").insert({ exam_id: examId, public_token_hash: hash(token), started_at: new Date().toISOString() });
    if (sessionError) return NextResponse.json({ error: "Could not create reopened session." }, { status: 409 });
    const { data, error } = await supabase.from("exams").update({ status: "active" }).eq("id", examId).eq("status", "closed").select().single();
    if (error || !data) return NextResponse.json({ error: "Could not reopen exam." }, { status: 409 });
    return NextResponse.json(examResponse({ ...data, publicUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/session/${token}` }));
  } catch (error) { return errorResponse(error); }
}