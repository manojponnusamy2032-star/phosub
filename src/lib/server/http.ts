import { NextResponse } from "next/server";

export async function errorResponse(error: unknown) {
  if (error instanceof Response) {
    const message = await error.text();
    return NextResponse.json({ error: message || "Request denied." }, { status: error.status });
  }
  const message = error instanceof Error ? error.message : "Request failed.";
  const missingConfiguration = message.toLowerCase().includes("not configured");
  return NextResponse.json({ error: missingConfiguration ? "Backend is not configured." : message }, { status: missingConfiguration ? 503 : 500 });
}

export function examResponse(exam: { id: string; title: string; class_name: string; expected_count: number; student_id_required: boolean; start_time: string; end_time: string; status: "scheduled" | "active" | "closed"; publicUrl?: string }) {
  return { id: exam.id, title: exam.title, className: exam.class_name, expectedCount: exam.expected_count, studentIdRequired: exam.student_id_required, startTime: exam.start_time, endTime: exam.end_time, status: exam.status, publicUrl: exam.publicUrl };
}