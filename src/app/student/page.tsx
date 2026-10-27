"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock3, LockKeyhole, Phone, RefreshCw } from "lucide-react";
import { phoneApi } from "@/lib/phone-api";
import type { PhoneStatus } from "@/lib/phone-types";

type StudentProfile = { full_name: string; college_email: string };
type ActiveSession = { id: string; title: string; class_group: string; classroom: string | null; started_at: string };
type StatusResult = { current_status?: PhoneStatus; updated_at?: string };

export default function StudentPhonePage() {
  const [profile, setProfile] = useState<StudentProfile>();
  const [session, setSession] = useState<ActiveSession>();
  const [status, setStatus] = useState<PhoneStatus>("not_reported");
  const [statusUpdatedAt, setStatusUpdatedAt] = useState<string>();
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async (silent = false) => {
    if (!silent) { setLoading(true); setError(""); }
    try {
      const active = await phoneApi.active();
      setProfile(active.profile);
      const nextSession = active.sessions?.[0];
      if (!nextSession) { setSession(undefined); return; }
      setSession(nextSession);
      const current = await phoneApi.get(nextSession.id) as { status?: StatusResult };
      const nextStatus = current.status?.current_status ?? "not_reported";
      setStatus(nextStatus);
      if (current.status?.updated_at) setStatusUpdatedAt(current.status.updated_at);
    } catch (loadError) {
      const raw = loadError instanceof Error ? loadError.message : "Could not load your phone session.";
      let friendly = raw;
      if (raw === "Student profile required") friendly = "Your student profile is not linked yet. Ask your mentor to link this login to your squad.";
      else if (raw.toLowerCase().includes("squad")) friendly = "Your squad has not been assigned yet. Please contact your mentor.";
      else if (raw.toLowerCase().includes("failed to fetch") || raw.toLowerCase().includes("network")) friendly = "Could not reach the server. Please try again.";
      setError(friendly);
    } finally {
      if (!silent) setLoading(false);
    }
  };
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); const refresh = window.setInterval(() => { void load(true); }, 10000); return () => { window.clearTimeout(timer); window.clearInterval(refresh); }; }, []);

  const update = async (nextStatus: "submitted" | "taken_back" | "not_submitted") => {
    if (!session || loading || busy) return;
    const trimmedReason = reason.trim();
    if ((nextStatus === "taken_back" || nextStatus === "not_submitted") && !trimmedReason) {
      setError("A reason is required for this status.");
      return;
    }
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await phoneApi.updateStatus(
        session.id,
        nextStatus,
        nextStatus === "submitted" ? undefined : trimmedReason,
      ) as StatusResult | null;
      if (!result?.current_status) throw new Error("Status change was not confirmed by the server.");
      setStatus(result.current_status);
      if (result.updated_at) setStatusUpdatedAt(result.updated_at);
      setReason("");
      setMessage(
        result.current_status === "submitted"
          ? "Phone submission recorded."
          : result.current_status === "taken_back"
            ? "Phone pickup recorded."
            : "Non-submission recorded.",
      );
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Status change was rejected.");
    } finally {
      setBusy(false);
    }
  };

  return <main className="app-grid min-h-screen px-4 py-7 sm:px-6"><div className="mx-auto max-w-lg"><header><p className="sans text-xs font-bold uppercase tracking-[.18em] text-[var(--blue)]">Phosub · phone check-in</p><h1 className="mt-2 text-4xl font-bold">Your phone status</h1>{profile && <p className="mt-3 sans text-sm text-[var(--muted)]">{profile.full_name} · {profile.college_email}</p>}</header>{error && <div role="alert" className="mt-6 rounded-lg border border-[#f0c6b6] bg-[#fff5f1] p-4 sans text-sm text-[#a54627]">{error}</div>}{loading && <section className="mt-8 rounded-xl border border-[var(--line)] bg-white p-7 text-center"><p className="sans text-sm text-[var(--muted)]">Loading your session…</p></section>}{!loading && !session && !error && <section className="mt-8 rounded-xl border border-[var(--line)] bg-white p-7 text-center"><Phone className="mx-auto text-[var(--blue)]" size={32} /><h2 className="mt-4 text-xl font-bold">No active session</h2><p className="mt-2 sans text-sm text-[var(--muted)]">Your mentor has not started an eligible phone session yet.</p><button onClick={() => void load()} className="mt-5 inline-flex items-center gap-2 rounded border border-[var(--line)] px-4 py-2 sans text-sm font-bold"><RefreshCw size={15} /> Refresh</button></section>}{session && <section className="mt-8 space-y-5"><div className="rounded-xl border border-[var(--line)] bg-white p-6"><p className="sans text-xs font-bold uppercase tracking-wide text-[var(--blue)]">Active session</p><h2 className="mt-2 text-2xl font-bold">{session.title}</h2><p className="mt-1 sans text-sm text-[var(--muted)]">{session.class_group}{session.classroom ? ` · ${session.classroom}` : ""}</p><p className="mt-4 flex items-center gap-2 sans text-xs text-[var(--muted)]"><Clock3 size={14} /> Started {new Date(session.started_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p></div><div className="rounded-xl border border-[var(--line)] bg-white p-6"><p className="sans text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Current status</p><div className="mt-3 flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e4f5ee] text-[var(--green)]"><CheckCircle2 size={22} /></div><p className="text-2xl font-bold">{status.replace("_", " ")}</p></div>{statusUpdatedAt && <p className="mt-2 sans text-xs text-[var(--muted)]">Updated {new Date(statusUpdatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p>}{status === "submitted" && <div className="mt-6"><ReasonAction disabled={busy} reason={reason} setReason={setReason} onSubmit={() => void update("taken_back")} label="Take my phone back" /></div>}{status === "taken_back" && <div className="mt-6"><ActionButton disabled={busy} onClick={() => void update("submitted")} label="Submit my phone again" /></div>}{status === "not_reported" && <div className="mt-6 grid gap-3"><ActionButton disabled={busy} onClick={() => void update("submitted")} label="Confirm phone submission" /><ReasonAction disabled={busy} reason={reason} setReason={setReason} onSubmit={() => void update("not_submitted")} label="Save non-submission reason" /></div>}{status === "not_submitted" && <div className="mt-6 grid gap-3"><ReasonAction disabled={busy} reason={reason} setReason={setReason} onSubmit={() => void update("not_submitted")} label="Update reason" /><ActionButton disabled={busy} onClick={() => void update("submitted")} label="Submit my phone" /></div>}{message && <p role="status" className="mt-4 sans text-sm font-bold text-[var(--green)]">{message}</p>}</div><p className="flex items-center gap-2 sans text-xs leading-5 text-[var(--muted)]"><LockKeyhole size={14} /> Status changes are tied to your authenticated college account and timestamped by the server.</p></section>}</div></main>; }

function ActionButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled: boolean }) { return <button disabled={disabled} onClick={onClick} className="min-h-12 w-full rounded bg-[var(--ink)] px-4 sans text-sm font-bold text-white disabled:opacity-60">{label}</button>; }
function ReasonAction({ label, reason, setReason, onSubmit, disabled }: { label: string; reason: string; setReason: (value: string) => void; onSubmit: () => void; disabled: boolean }) { return <div className="rounded-lg border border-[var(--line)] p-4"><label className="sans text-sm font-bold">Reason<textarea value={reason} onChange={(event) => setReason(event.target.value)} className="input mt-2 min-h-20" placeholder="Briefly explain" /></label><button disabled={disabled || !reason.trim()} onClick={onSubmit} className="mt-3 min-h-11 w-full rounded bg-[var(--orange)] px-4 sans text-sm font-bold text-white disabled:opacity-50">{label}</button></div>; }
