"use client";

import { FormEvent, useEffect, useState } from "react";
import { Eye, EyeOff, GraduationCap, LockKeyhole, Phone, QrCode, User } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";
import { ALLOWED_SQUADS } from "@/lib/squads";

type Mode = "signin" | "signup";
type Role = "mentor" | "student";

export default function LoginPage() {
  const [role, setRole] = useState<Role>("mentor");
  const [mode, setMode] = useState<Mode>("signin");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (new URLSearchParams(window.location.search).get("error") === "configuration") setError("The backend is not configured. Add the Supabase environment variables before signing in.");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formEl = event.currentTarget;
    setBusy(true); setError("");
    const form = new FormData(formEl);
    try {
      const client = createSupabaseBrowserClient();
      if (mode === "signin") {
        const email = String(form.get("email")).trim().toLowerCase();
        const password = String(form.get("password"));
        const squad = role === "student" ? String(form.get("squad")) : "";
        if (role === "student" && !ALLOWED_SQUADS.includes(squad as (typeof ALLOWED_SQUADS)[number])) {
          setError("Select your assigned squad to continue.");
          return;
        }
        const { data, error: signInError } = await client.auth.signInWithPassword({ email, password });
        if (signInError) { setError(signInError.message || "Sign in failed. Check your college email and password."); return; }
        if (role === "mentor") {
          const response = await fetch("/api/auth/staff", { cache: "no-store" });
          const body = await response.json().catch(() => null);
          if (!response.ok) {
            if (response.status === 401 || response.status === 403) await client.auth.signOut();
            setError(response.status === 403 ? "This account is not authorized as a mentor or teacher." : body?.error ?? "Could not verify staff access. Please try again.");
            return;
          }
          router.replace("/");
        } else {
          const { data: profile } = await client.from("student_profiles").select("user_id, squad").eq("user_id", data.user.id).single();
          if (!profile) {
            await client.auth.signOut();
            setError("This account is not a student account. Contact your mentor.");
            return;
          }
          if (!profile.squad) {
            await client.auth.signOut();
            setError("Your squad has not been assigned yet. Contact your mentor.");
            return;
          }
          if (profile.squad !== squad) {
            await client.auth.signOut();
            setError("That selection does not match your assigned squad. Contact your mentor if you need help.");
            return;
          }
          router.replace("/student");
        }
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
        if (!ALLOWED_SQUADS.includes(squad as (typeof ALLOWED_SQUADS)[number])) { setError("Select your squad."); return; }

        const endpoint = role === "mentor" ? "/api/mentor-signup" : "/api/student-signup";
        const res = await fetch(endpoint, {
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
    } catch (e) { setError(e instanceof Error ? e.message : "Authentication is not configured correctly."); }
    finally { setBusy(false); }
  };

  const isStudent = role === "student";
  const Icon = isStudent ? Phone : QrCode;
  const title = mode === "signin" ? (isStudent ? "Student sign in" : "Mentor / teacher sign in") : (isStudent ? "Create student account" : "Create mentor account");

  return (
    <main className="app-grid flex min-h-screen items-center justify-center px-5 py-10">
      <section className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-white p-7 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center bg-[var(--ink)] text-white"><Icon size={22} /></div>
          <div>
            <p className="sans text-[11px] font-bold uppercase tracking-[.18em] text-[var(--orange)]">Phosub</p>
            <p className="text-lg font-bold leading-none">{title}</p>
          </div>
          {isStudent && <GraduationCap size={14} className="ml-auto text-[var(--orange)]" />}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2 rounded-lg border border-[var(--line)] bg-[var(--paper)] p-1">
          <button type="button" onClick={() => { setRole("mentor"); setMode("signin"); setError(""); }} className={`rounded px-3 py-2 sans text-sm font-bold ${role === "mentor" ? "bg-[var(--ink)] text-white" : "text-[var(--ink)]"}`}>Mentor / Teacher</button>
          <button type="button" onClick={() => { setRole("student"); setError(""); }} className={`rounded px-3 py-2 sans text-sm font-bold ${role === "student" ? "bg-[var(--ink)] text-white" : "text-[var(--ink)]"}`}>Student</button>
        </div>

        <p className="mt-6 text-2xl font-bold">{mode === "signin" ? (isStudent ? "Welcome back." : "Open your exam workspace.") : (isStudent ? "Join your class." : "Join as a mentor.")}</p>
        <p className="mt-2 sans text-sm leading-6 text-[var(--muted)]">
          {mode === "signin"
            ? (isStudent ? "Use your college account to check in your phone status." : "Use your college account to manage sessions and view authorized submissions.")
            : (isStudent ? "Create a student account to record your phone status." : "Create a mentor account to manage phone sessions and student check-ins.")}
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "signup" && (
            <>
              <label className="block flex items-center gap-2"><span className="sans text-sm font-bold">Full name</span><User size={14} className="text-[var(--muted)]" /><input name="full_name" className="input mt-2 flex-1" required autoComplete="name" placeholder={isStudent ? "Demo Student" : "Demo Mentor"} /></label>
              <label className="block flex items-center gap-2"><span className="sans text-sm font-bold">College email</span><User size={14} className="text-[var(--muted)]" /><input name="college_email" className="input mt-2 flex-1" type="email" required autoComplete="email" placeholder={isStudent ? "student@college.edu" : "mentor@college.edu"} /></label>
              <label className="block"><span className="sans text-sm font-bold">Squad</span><select name="squad" className="input mt-2 w-full" required defaultValue=""><option value="" disabled>Select your squad</option><option value="138">Squad 138</option><option value="139">Squad 139</option><option value="183">Squad 183</option></select></label>
            </>
          )}
          {mode === "signin" && (
            <>
              {isStudent && <label className="block"><span className="sans text-sm font-bold">Squad</span><select name="squad" className="input mt-2 w-full" required defaultValue=""><option value="" disabled>Select your assigned squad</option>{ALLOWED_SQUADS.map((squad) => <option key={squad} value={squad}>Squad {squad}</option>)}</select></label>}
              <label className="block flex items-center gap-2"><span className="sans text-sm font-bold">College email</span><User size={14} className="text-[var(--muted)]" /><input name="email" className="input mt-2 flex-1" type="email" required autoComplete="email" placeholder={isStudent ? "student@college.edu" : "teacher@college.edu"} /></label>
            </>
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
          <button disabled={busy} className="flex min-h-12 w-full items-center justify-center gap-2 rounded bg-[var(--ink)] px-5 sans text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
            <LockKeyhole size={16} /> {busy ? "Working…" : mode === "signin" ? (isStudent ? "Sign in as student" : "Sign in") : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center sans text-sm">
          {mode === "signin"
            ? (isStudent ? <span>Don&apos;t have an account? <button type="button" onClick={() => { setMode("signup"); setError(""); }} className="font-bold text-[var(--ink)] underline underline-offset-4">Create one</button>. <button type="button" onClick={() => router.replace("/forgot-password")} className="font-bold text-[var(--ink)] underline underline-offset-4">Forgot password?</button></span> : <span><button type="button" onClick={() => router.replace("/forgot-password")} className="font-bold text-[var(--ink)] underline underline-offset-4">Forgot password?</button></span>)
            : <span>Already have an account? <button type="button" onClick={() => { setMode("signin"); setError(""); }} className="font-bold text-[var(--ink)] underline underline-offset-4">Sign in</button>.</span>}
        </p>
        {isStudent && <p className="mt-3 text-center sans text-xs text-[var(--muted)]">Problems signing in? Ask your mentor to provision your account.</p>}
      </section>
    </main>
  );
}
