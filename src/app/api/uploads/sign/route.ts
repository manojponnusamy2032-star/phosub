import { randomBytes, createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { errorResponse } from "@/lib/server/http";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const inputSchema = z.object({ sessionId: z.string().min(20), fileName: z.string().min(1).max(160), contentType: z.enum(["image/jpeg", "image/png", "image/webp"]), size: z.number().int().positive().max(5 * 1024 * 1024) });

export async function POST(request: Request) {
  try {
    const admin = createSupabaseAdminClient();
    const parsed = inputSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid upload request" }, { status: 400 });
    const { data: session, error } = await admin.from("exam_sessions").select("id, exams(status, end_time)").eq("public_token_hash", hash(parsed.data.sessionId)).single();
    const exam = session?.exams as unknown as { status: "scheduled" | "active" | "closed"; end_time: string } | null;
    if (error || !session || !exam || exam.status !== "active" || new Date(exam.end_time).getTime() <= Date.now()) return NextResponse.json({ error: "Session cannot accept uploads." }, { status: 409 });
    const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "exam-photos";
    const path = `sessions/${session.id}/${randomBytes(18).toString("hex")}-${parsed.data.fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { data, error: signError } = await admin.storage.from(bucket).createSignedUploadUrl(path);
    if (signError || !data) return NextResponse.json({ error: "Could not prepare upload." }, { status: 503 });
    return NextResponse.json({ bucket, path, token: data.token, signedUrl: data.signedUrl, expiresIn: 600 });
  } catch (error) { return errorResponse(error); }
}