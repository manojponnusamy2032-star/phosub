import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/server/http";
import { requireTeacher } from "@/lib/supabase/server";

export async function GET() {
  try {
    const { user, profile } = await requireTeacher();
    return NextResponse.json({ id: user.id, role: profile.role });
  } catch (error) {
    return errorResponse(error);
  }
}