"use client";

import { FormEvent, useState } from "react";
import { LockKeyhole, Phone } from "lucide-react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function StudentLoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const { error: signInError } = await createSupabaseBrowserClient().auth.signInWithPassword({ email: String(form.get("email")), password: String(form.get("password")) });
      if (signInError) { setError("Sign in failed. Check your college email and password."); return; }
      router.replace("/student");
      router.refresh();
    } catch { setError("Authentication is not configured correctly."); }
    finally { setBusy(false); }
  };

  return <main className="app-grid flex min-h-screen items-center justify-center px-5 py-10"><section className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-white p-7 shadow-sm"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center bg-[var(--ink)] text-white"><Phone size={22} /></div><div><p className="sans text-[11px] font-bold uppercase tracking-[.18em] text-[var(--orange)]">Phosub</p><p className="text-lg font-bold leading-none">Student sign in</p></div></div><p className="mt-8 text-2xl font-bold">Check in your phone status.</p><p className="mt-2 sans text-sm leading-6 text-[var(--muted)]">Use your college account to view eligible active sessions and record your phone status.</p><form onSubmit={submit} className="mt-6 space-y-4"><label className="block"><span className="sans text-sm font-bold">College email</span><input name="email" className="input mt-2" type="email" required autoComplete="email" placeholder="student@college.edu" /></label><label className="block"><span className="sans text-sm font-bold">Password</span><input name="password" className="input mt-2" type="password" required autoComplete="current-password" placeholder="••••••••" /></label>{error && <p role="alert" className="sans text-sm text-[#b9502b]">{error}</p>}<button disabled={busy} className="flex min-h-12 w-full items-center justify-center gap-2 rounded bg-[var(--ink)] px-5 sans text-sm font-bold text-white disabled:opacity-60"><LockKeyhole size={16} /> {busy ? "Signing in…" : "Sign in as student"}</button></form><p className="mt-5 text-center sans text-xs text-[var(--muted)]">Your student profile must be provisioned by an administrator.</p></section></main>;
}
