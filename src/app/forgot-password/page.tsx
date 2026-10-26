"use client";

import { FormEvent, useState } from "react";
import { LockKeyhole, Mail, Send } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const client = createSupabaseBrowserClient();
      const { error: resetError } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });
      if (resetError) { setError(resetError.message || "Could not send reset link."); return; }
      setMessage("If an account exists for this email, a password reset link has been sent.");
      setEmail("");
    } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong."); }
    finally { setBusy(false); }
  };

  return (
    <main className="app-grid flex min-h-screen items-center justify-center px-5 py-10">
      <section className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-white p-7 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center bg-[var(--ink)] text-white"><LockKeyhole size={22} /></div>
          <div className="ml-2">
            <p className="sans text-[11px] font-bold uppercase tracking-[.18em] text-[var(--orange)]">Phosub</p>
            <p className="text-lg font-bold leading-none">Reset Password</p>
          </div>
        </div>

        <p className="mt-6 text-2xl font-bold">Forgot your password?</p>
        <p className="mt-2 sans text-sm leading-6 text-[var(--muted)]">
          Enter your college email and we will send you a reset link.
        </p>

        {error && <p role="alert" className="mt-4 sans text-sm text-[#b9502b]">{error}</p>}
        {message && <p className="mt-4 sans text-sm text-[var(--green)]">{message}</p>}

        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block flex items-center gap-2">
            <span className="sans text-sm font-bold">College email</span>
            <Mail size={14} className="text-[var(--muted)]" />
            <input name="email" className="input mt-2 flex-1" type="email" required autoComplete="email" placeholder="student@college.edu" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <button disabled={busy} className="flex min-h-12 w-full items-center justify-center gap-2 rounded bg-[var(--ink)] px-5 sans text-sm font-bold text-white disabled:opacity-50">
            <Send size={16} /> {busy ? "Sending…" : "Send reset link"}
          </button>
        </form>

        <p className="mt-6 text-center sans text-sm">
          Remember your password? <button type="button" onClick={() => router.replace("/login")} className="font-bold text-[var(--ink)] underline underline-offset-4">Sign in</button>.
        </p>
      </section>
    </main>
  );
}
