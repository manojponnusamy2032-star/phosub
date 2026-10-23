import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { errorResponse } from "@/lib/server/http";
import { requireTeacher } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ examId: string; submissionId: string }> }) {
  try {
    const { supabase } = await requireTeacher();
    const { examId, submissionId } = await params;
    const { data: submission, error } = await supabase.from("submissions").select("photo_path").eq("id", submissionId).eq("exam_id", examId).single();
    if (error || !submission?.photo_path) return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    const admin = createSupabaseAdminClient();
    const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "exam-photos";
    const { data, error: signError } = await admin.storage.from(bucket).createSignedUrl(submission.photo_path, 300);
    if (signError || !data) return NextResponse.json({ error: "Could not prepare photo access." }, { status: 503 });
    return NextResponse.json({ url: data.signedUrl, expiresIn: 300 });
  } catch (error) { return errorResponse(error); }
}