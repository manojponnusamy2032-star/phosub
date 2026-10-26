import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasSupabasePublicConfig } from "@/lib/supabase/config";

export async function proxy(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_USE_MOCK_ADAPTER === "true" || (process.env.NODE_ENV !== "production" && !process.env.NEXT_PUBLIC_USE_MOCK_ADAPTER)) return NextResponse.next();
  const pathname = request.nextUrl.pathname;
  const isPublic = pathname === "/login" || pathname === "/student/login" || pathname === "/logout" || pathname === "/api/auth/logout" || pathname.startsWith("/session/") || pathname.startsWith("/classroom/") || pathname.startsWith("/api/sessions/") || pathname.startsWith("/api/uploads/");
  if (isPublic) return NextResponse.next();
  const response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!hasSupabasePublicConfig() || !url || !key) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Backend is not configured." }, { status: 503 });
    return NextResponse.redirect(new URL("/login?error=configuration", request.url));
  }
  const supabase = createServerClient(url, key, { cookies: { getAll: () => request.cookies.getAll(), setAll: (values) => values.forEach(({ name, value, options }) => { request.cookies.set(name, value); response.cookies.set(name, value, options); }) } });
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return response;
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };