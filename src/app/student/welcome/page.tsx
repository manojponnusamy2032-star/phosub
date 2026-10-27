"use client";

import { FormEvent, useState } from "react";
import { LockKeyhole, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { ALLOWED_SQUADS } from "@/lib/squads";

export default function StudentWelcomePage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const client = createSupabaseBrowserClient();
      const squad = String(form.get("squad"));
      if (!ALLOWED_SQUADS.includes(squad as (typeof ALLOWED_SQUADS)[number])) { setError("Select your assigned squad to continue."); return; }
      const { data, error: signInError } = await client.auth.signInWithPassword({ email: String(form.get("email")), password: String(form.get("password")) });
      if (signInError) { setError(signInError.message || "Sign in failed. Check your college email and password."); return; }
      const { data: profile } = await client.from("student_profiles").select("user_id, squad").eq("user_id", data.user.id).single();
      if (!profile) {
        await client.auth.signOut();
        setError("This account is not a student account. Contact your mentor.");
        return;
      }
      if (profile.squad !== squad) {
        await client.auth.signOut();
        setError(profile.squad ? "That selection does not match your assigned squad." : "Your squad has not been assigned yet. Contact your mentor.");
        return;
      }
      router.replace("/student");
      router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "Authentication is not configured correctly."); }
    finally { setBusy(false); }
  };

  return (
    <main className="app-grid flex min-h-screen items-center justify-center px-5 py-10">
      <section className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-white p-7 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center bg-[var(--ink)] text-white"><Sparkles size={22} /></div>
          <div>
            <p className="sans text-[11px] font-bold uppercase tracking-[.18em] text-[var(--orange)]">Phosub</p>
            <p className="text-lg font-bold leading-none">Student welcome</p>
          </div>
        </div>
        <p className="mt-8 text-2xl font-bold">Welcome to your first session.</p>
        <p className="mt-2 sans text-sm leading-6 text-[var(--muted)]">Your mentor created your account. Sign in with the credentials they shared to check in your phone status.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block"><span className="sans text-sm font-bold">Squad</span><select name="squad" className="input mt-2 w-full" required defaultValue=""><option value="" disabled>Select your assigned squad</option>{ALLOWED_SQUADS.map((squad) => <option key={squad} value={squad}>Squad {squad}</option>)}</select></label>
          <label className="block"><span className="sans text-sm font-bold">College email</span><input name="email" className="input mt-2" type="email" required autoComplete="email" placeholder="student@college.edu" /></label>
          <label className="block"><span className="sans text-sm font-bold">Password</span><input name="password" className="input mt-2" type="password" required autoComplete="current-password" placeholder="••••••••" /></label>
          {error && <p role="alert" className="sans text-sm text-[#b9502b]">{error}</p>}
          <button disabled={busy} className="flex min-h-12 w-full items-center justify-center gap-2 rounded bg-[var(--ink)] px-5 sans text-sm font-bold text-white disabled:opacity-60"><LockKeyhole size={16} /> {busy ? "Signing in…" : "Sign in as student"}</button>
        </form>
        <p className="mt-5 text-center sans text-xs text-[var(--muted)]">Already have an account? <a href="/student/login" className="font-bold text-[var(--ink)]">Use the standard login</a>.</p>
      </section>
    </main>
  );
}
