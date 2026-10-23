"use client";

import { FormEvent, useEffect, useState } from "react";
import { LockKeyhole, QrCode } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [error, setError] = useState("");
  const router = useRouter();
  const mockMode = process.env.NEXT_PUBLIC_USE_MOCK_ADAPTER === "true" || (process.env.NODE_ENV !== "production" && !process.env.NEXT_PUBLIC_USE_MOCK_ADAPTER);
  useEffect(() => { const timer = window.setTimeout(() => { if (new URLSearchParams(window.location.search).get("error") === "configuration") setError("The backend is not configured. Add the Supabase environment variables before signing in."); }, 0); return () => window.clearTimeout(timer); }, []);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mockMode) { setError("Teacher authentication is not configured in this environment."); return; }
    const form = new FormData(event.currentTarget);
    try {
      const { error: signInError } = await createSupabaseBrowserClient().auth.signInWithPassword({ email: String(form.get("email")), password: String(form.get("password")) });
      if (signInError) { setError("Sign in failed. Check your college email and password."); return; }
      router.replace("/");
    } catch { setError("Authentication is not configured correctly."); }
  };
  return <main className="app-grid flex min-h-screen items-center justify-center px-5 py-10"><section className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-white p-7 shadow-sm"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center bg-[var(--ink)] text-white"><QrCode size={22} /></div><div><p className="sans text-[11px] font-bold uppercase tracking-[.18em] text-[var(--orange)]">Phosub</p><p className="text-lg font-bold leading-none">Teacher sign in</p></div></div><p className="mt-8 text-2xl font-bold">Open your exam workspace.</p><p className="mt-2 sans text-sm leading-6 text-[var(--muted)]">Use your college account to manage sessions and view authorized submissions.</p>{mockMode && <div className="mt-5 rounded-lg border border-[#ecd6bd] bg-[#fff8ed] p-3 sans text-xs leading-5 text-[#8b5d22]">Mock adapter enabled. Authentication is intentionally unavailable until a live auth provider is configured.</div>}<form onSubmit={submit} className="mt-6 space-y-4"><label className="block"><span className="sans text-sm font-bold">College email</span><input name="email" className="input mt-2" type="email" required placeholder="teacher@college.edu" /></label><label className="block"><span className="sans text-sm font-bold">Password</span><input name="password" className="input mt-2" type="password" required placeholder="••••••••" /></label>{error && <p role="alert" className="sans text-sm text-[#b9502b]">{error}</p>}<button disabled={mockMode} className="flex min-h-12 w-full items-center justify-center gap-2 rounded bg-[var(--ink)] px-5 sans text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"><LockKeyhole size={16} /> Sign in</button></form></section></main>;
}