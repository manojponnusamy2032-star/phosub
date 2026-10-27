import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Public mentor registration is disabled. Ask an administrator to provision your mentor account." },
    { status: 403 },
  );
}
