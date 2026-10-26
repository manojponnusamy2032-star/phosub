import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse } from "@/lib/server/http";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const signupSchema = z.object({
  full_name: z.string().trim().min(2, "Full name must be at least 2 characters."),
  college_email: z.string().trim().email("Enter a valid college email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  confirm_password: z.string(),
  squad: z.enum(["138", "139", "183"], { message: "Select your squad." }),
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords do not match.",
  path: ["confirm_password"],
});

export async function POST(request: Request) {
  try {
    const parsed = signupSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid details", issues: parsed.error.flatten() }, { status: 400 });
    const admin = createSupabaseAdminClient();

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: parsed.data.college_email.toLowerCase(),
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: { full_name: parsed.data.full_name },
    });
    if (createError || !created.user) return NextResponse.json({ error: createError?.message ?? "Could not create account." }, { status: 400 });

    const { error: profileError } = await admin.from("teacher_profiles").insert({
      id: created.user.id,
      role: "mentor",
      squad: parsed.data.squad,
    });
    if (profileError) {
      await admin.auth.admin.deleteUser(created.user.id).catch(() => undefined);
      return NextResponse.json({ error: profileError.message ?? "Could not create profile." }, { status: 400 });
    }

    return NextResponse.json({ id: created.user.id, email: parsed.data.college_email, full_name: parsed.data.full_name }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}