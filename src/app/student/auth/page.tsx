"use client";

import { FormEvent, useState } from "react";
import { Eye, EyeOff, LockKeyhole, Phone, User, GraduationCap } from "lucide-react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Mode = "signin" | "signup";

export default function StudentAuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const client = createSupabaseBrowserClient();

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formEl = event.currentTarget;
    setBusy(true); setError("");
    const form = new FormData(formEl);

    try {
      if (mode === "signin") {
        const email = String(form.get("email")).trim().toLowerCase();
        const password = String(form.get("password"));
        const { data, error: signInError } = await client.auth.signInWithPassword({ email, password });
        if (signInError) { setError(signInError.message || "Sign in failed. Check your college email and password."); return; }
        const { data: profile } = await client.from("student_profiles").select("user_id").eq("user_id", data.user.id).single();
        if (!profile) {
          await client.auth.signOut();
          setError("This account is not a student account. Contact your mentor.");
          return;
        }
        router.replace("/student");
        router.refresh();
      } else {
        const full_name = String(form.get("full_name"));
        const college_email = String(form.get("college_email"));
        const password = String(form.get("password"));
        const confirm_password = String(form.get("confirm_password"));
        const squad = String(form.get("squad"));

        if (!full_name.trim() || full_name.trim().length < 2) { setError("Full name must be at least 2 characters."); return; }
        if (!college_email.trim()) { setError("College email is required."); return; }
        if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
        if (password !== confirm_password) { setError("Passwords do not match."); return; }
        if (!["138","139","183"].includes(squad)) { setError("Select your squad."); return; }

        const res = await fetch("/api/student-signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ full_name, college_email, password, confirm_password, squad }),
        });
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.error ?? "Could not create account.");

        setError("");
        if (formEl) {
          try { formEl.reset(); } catch { /* ignore */ }
        }
        setMode("signin");
        setError("Account created. You can now sign in.");
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong."); }
    finally { setBusy(false); }
  };

  return (
    <main className="app-grid flex min-h-screen items-center justify-center px-5 py-10">
      <section className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-white p-7 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center bg-[var(--ink)] text-white"><Phone size={22} /></div>
          <div className="ml-2"><GraduationCap size={14} className="ml-2 text-[var(--orange)]" /></div>
          <div>
            <p className="sans text-[11px] font-bold uppercase tracking-[.18em] text-[var(--orange)]">Phosub</p>
            <p className="text-lg font-bold leading-none">{mode === "signin" ? "Student sign in" : "Create student account"}</p>
          </div>
        </div>

        {mode === "signin"
          ? <p className="mt-8 text-2xl font-bold">Welcome back.</p>
          : <p className="mt-8 text-2xl font-bold">Join your class.</p>}
        <p className="mt-2 sans text-sm leading-6 text-[var(--muted)]">
          {mode === "signin"
            ? "Use your college account to check in your phone status."
            : "Your mentor will create sessions. Once signed up, sign in to record your phone status."}
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "signup" && (
            <>
              <label className="block flex items-center gap-2"><span className="sans text-sm font-bold">Full name</span><User size={14} className="text-[var(--muted)]" /><input name="full_name" className="input mt-2 flex-1" required autoComplete="name" placeholder="Demo Student" /></label>
              <label className="block flex items-center gap-2"><span className="sans text-sm font-bold">College email</span><User size={14} className="text-[var(--muted)]" /><input name="college_email" className="input mt-2 flex-1" type="email" required autoComplete="email" placeholder="student@college.edu" /></label>
              <label className="block"><span className="sans text-sm font-bold">Squad</span><select name="squad" className="input mt-2 w-full" required defaultValue=""><option value="" disabled>Select your squad</option><option value="138">Squad 138</option><option value="139">Squad 139</option><option value="183">Squad 183</option></select></label>
            </>
          )}
          {mode === "signin" && (
            <label className="block flex items-center gap-2"><span className="sans text-sm font-bold">College email</span><User size={14} className="text-[var(--muted)]" /><input name="email" className="input mt-2 flex-1" type="email" required autoComplete="email" placeholder="student@college.edu" /></label>
          )}
          <label className="block relative">
            <span className="sans text-sm font-bold">Password</span>
            <LockKeyhole size={14} className="text-[var(--muted)]" />
            <input
              name="password"
              className="input mt-2 flex-1 pr-10"
              type={showPassword ? "text" : "password"}
              required
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              placeholder="••••••••"
            />
            <button
              type="button"
              className="absolute right-2 mt-2 text-[var(--muted)] hover:text-[var(--ink)]"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </label>
          {mode === "signup" && (
            <label className="block relative">
              <span className="sans text-sm font-bold">Confirm password</span>
              <LockKeyhole size={14} className="text-[var(--muted)]" />
              <input
                name="confirm_password"
                className="input mt-2 flex-1 pr-10"
                type={showConfirmPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                placeholder="••••••••"
              />
              <button
                type="button"
                className="absolute right-2 mt-2 text-[var(--muted)] hover:text-[var(--ink)]"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </label>
          )}
          {error && <p role="alert" className="sans text-sm text-[#b9502b]">{error}</p>}
          <button disabled={busy} className="flex min-h-12 w-full items-center justify-center gap-2 rounded bg-[var(--ink)] px-5 sans text-sm font-bold text-white disabled:opacity-60">
            {busy ? "Working…" : mode === "signin" ? "Sign in as student" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center sans text-sm">
          {mode === "signin"
            ? <span>Don't have an account? <button type="button" onClick={() => { setMode("signup"); setError(""); }} className="font-bold text-[var(--ink)] underline underline-offset-4">Create one</button>.</span>
            : <span>Already have an account? <button type="button" onClick={() => { setMode("signin"); setError(""); }} className="font-bold text-[var(--ink)] underline underline-offset-4">Sign in</button>.</span>}
        </p>
        <p className="mt-3 text-center sans text-xs text-[var(--muted)]">Problems signing in? Ask your mentor to provision your account.</p>
      </section>
    </main>
  );
}
