import { NextResponse } from "next/server";
import { examSchema } from "@/lib/validation";
import { errorResponse, examResponse } from "@/lib/server/http";
import { requireTeacher } from "@/lib/supabase/server";

export async function GET() {
  try {
    const { supabase } = await requireTeacher();
    const { data, error } = await supabase.from("exams").select("*").order("start_time", { ascending: false });
    if (error) return NextResponse.json({ error: "Could not load exams." }, { status: 400 });
    return NextResponse.json((data ?? []).map(examResponse));
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireTeacher();
    const parsed = examSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid exam details", issues: parsed.error.flatten() }, { status: 400 });
    const { data, error } = await supabase.from("exams").insert({ owner_id: user.id, title: parsed.data.title, class_name: parsed.data.className, expected_count: parsed.data.expectedCount, student_id_required: parsed.data.studentIdRequired, start_time: parsed.data.startTime, end_time: parsed.data.endTime }).select().single();
    if (error || !data) return NextResponse.json({ error: error?.message ?? "Could not create exam" }, { status: 400 });
    return NextResponse.json(examResponse(data), { status: 201 });
  } catch (error) { return errorResponse(error); }
}