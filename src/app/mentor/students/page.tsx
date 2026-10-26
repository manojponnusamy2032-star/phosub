"use client";

import { FormEvent, useEffect, useState } from "react";
import { Users, Copy, Check } from "lucide-react";

type Student = { user_id: string; full_name: string; college_email: string; created_at: string };

export default function MentorStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/students");
      if (res.ok) setStudents(await res.json());
    })();
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true); setError(""); setCreated(null);
    const form = new FormData(event.currentTarget);
    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.get("full_name"),
          college_email: form.get("college_email"),
          password: form.get("password"),
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Could not create student.");
      setCreated({ email: String(form.get("college_email")), password: String(form.get("password")) });
      (event.currentTarget as HTMLFormElement).reset();
      const res2 = await fetch("/api/students");
      if (res2.ok) setStudents(await res2.json());
    } catch (e) { setError(e instanceof Error ? e.message : "Could not create student."); }
    finally { setBusy(false); }
  };

  const copyCreds = () => {
    if (!created) return;
    navigator.clipboard.writeText(`Email: ${created.email}\nPassword: ${created.password}\nLogin: ${window.location.origin}/student/login`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="app-grid min-h-screen px-5 py-8">
      <section className="mx-auto w-full max-w-3xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center bg-[var(--ink)] text-white"><Users size={20} /></div>
          <div>
            <p className="sans text-[11px] font-bold uppercase tracking-[.18em] text-[var(--orange)]">Phosub</p>
            <p className="text-lg font-bold leading-none">Student onboarding</p>
          </div>
        </div>
        <p className="mt-6 text-2xl font-bold">Create student accounts.</p>
        <p className="mt-2 sans text-sm leading-6 text-[var(--muted)]">Provision college accounts for students. Share the generated credentials so they can sign in at <code>/student/login</code>.</p>

        <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm">
          <label className="block"><span className="sans text-sm font-bold">Full name</span><input name="full_name" className="input mt-2" required placeholder="Demo Student" /></label>
          <label className="block"><span className="sans text-sm font-bold">College email</span><input name="college_email" type="email" className="input mt-2" required placeholder="student@college.edu" /></label>
          <label className="block"><span className="sans text-sm font-bold">Temporary password</span><input name="password" type="password" className="input mt-2" required minLength={8} placeholder="••••••••" /></label>
          {error && <p role="alert" className="sans text-sm text-[#b9502b]">{error}</p>}
          {created && (
            <div className="rounded-lg border border-[#d8e6d8] bg-[#f3faf3] p-3 sans text-sm">
              <p className="font-bold text-[#2f6b3a]">Student created: {created.email}</p>
              <p className="mt-1 text-[#2f6b3a]">Share these credentials: password <code>{created.password}</code></p>
              <button type="button" onClick={copyCreds} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#2f6b3a]">
                {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy credentials"}
              </button>
            </div>
          )}
          <button disabled={busy} className="flex min-h-12 w-full items-center justify-center gap-2 rounded bg-[var(--ink)] px-5 sans text-sm font-bold text-white disabled:opacity-60">
            {busy ? "Creating…" : "Create student account"}
          </button>
        </form>

        <div className="mt-8">
          <h2 className="text-lg font-bold">Provisioned students</h2>
          <ul className="mt-3 divide-y divide-[var(--line)] rounded-2xl border border-[var(--line)] bg-white">
            {students.length === 0 && <li className="p-4 sans text-sm text-[var(--muted)]">No students yet.</li>}
            {students.map((s) => (
              <li key={s.user_id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-bold">{s.full_name}</p>
                  <p className="sans text-xs text-[var(--muted)]">{s.college_email}</p>
                </div>
                <p className="sans text-xs text-[var(--muted)]">{new Date(s.created_at).toLocaleDateString()}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
