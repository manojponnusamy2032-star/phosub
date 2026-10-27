"use client";
/* eslint-disable @next/next/no-html-link-for-pages */

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Clock3, Phone, Plus, RefreshCw, Square, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { phoneApi } from "@/lib/phone-api";
import type { PhoneSession, PhoneStatusEvent, StudentPhoneStatus } from "@/lib/phone-types";

type SummaryCard = [string, number, LucideIcon];

export default function MentorPhonePage() {
  const [sessions, setSessions] = useState<PhoneSession[]>([]);
  const [selected, setSelected] = useState<PhoneSession>();
  const [students, setStudents] = useState<StudentPhoneStatus[]>([]);
  const [events, setEvents] = useState<PhoneStatusEvent[]>([]);
  const [title, setTitle] = useState("");
  const [classGroup, setClassGroup] = useState("");
  const [classroom, setClassroom] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadSeq = useRef(0);
  const isLoadingRef = useRef(false);

  const selectedIdRef = useRef<string | undefined>(selected?.id);
  useEffect(() => { selectedIdRef.current = selected?.id; }, [selected?.id]);

  const load = useCallback(async ({ initial = false, selectId }: { initial?: boolean; selectId?: string } = {}) => {
    if (isLoadingRef.current) return;
    const seq = ++loadSeq.current;
    isLoadingRef.current = true;
    if (initial) setLoading(true);
    try {
      const list = await phoneApi.list();
      if (seq !== loadSeq.current) return;
      setSessions(list);
      setError("");
      if (initial) setLoading(false);
      const targetId = selectId ?? selectedIdRef.current;
      const target = targetId
        ? list.find((item) => item.id === targetId)
        : (list.find((item) => item.status === "active") ?? list[0]);
      if (!target) return;
      const detail = await phoneApi.get(target.id);
      if (seq !== loadSeq.current) return;
      setSelected(detail.session);
      setStudents(detail.students);
      const ev = await phoneApi.events(target.id);
      if (seq !== loadSeq.current) return;
      setEvents(ev);
    } catch (loadError) {
      if (seq !== loadSeq.current) return;
      if (initial) setLoading(false);
      const message = loadError instanceof Error ? loadError.message : "Could not load phone sessions.";
      setError(message);
    } finally {
      isLoadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    const firstLoad = window.setTimeout(() => { void load({ initial: true }); }, 0);
    const refresh = window.setInterval(() => { void load({ initial: false }); }, 5000);
    return () => { window.clearTimeout(firstLoad); window.clearInterval(refresh); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function create() {
    setBusy(true);
    setError("");
    setFieldErrors({});
    try {
      const session = await phoneApi.create({ title, classGroup, classroom });
      setTitle(""); setClassGroup(""); setClassroom("");
      setSessions((prev) => [session, ...prev.filter((s) => s.id !== session.id)]);
      setSelected(session);
      setStudents([]);
      setEvents([]);
      // Refresh details and list.
      try {
        const detail = await phoneApi.get(session.id);
        setSelected(detail.session);
        setStudents(detail.students);
        setEvents(await phoneApi.events(session.id));
      } catch {
        // Keep created session selected even if detail fetch fails.
      }
      void load({ selectId: session.id });
    } catch (createError) {
      const err = createError as Error & { issues?: unknown };
      if (err.issues) {
        const fieldErrors: Record<string, string> = {};
        const flat = err.issues as { fieldErrors?: Record<string, { message: string }[]> };
        Object.entries(flat.fieldErrors ?? {}).forEach(([key, val]) => {
          fieldErrors[key] = val?.[0]?.message ?? "Invalid";
        });
        setFieldErrors(fieldErrors);
        setError(Object.values(fieldErrors).join(" "));
      } else {
        setError(err instanceof Error ? err.message : "Could not start session.");
      }
    } finally { setBusy(false); }
  }

  async function end() {
    if (!selected || !window.confirm("End this phone session? Students will no longer be able to change status.")) return;
    setBusy(true);
    try {
      const ended = await phoneApi.end(selected.id);
      setSelected(ended);
      setSessions((prev) => prev.map((s) => (s.id === ended.id ? ended : s)));
      await load({ selectId: ended.id });
    } catch (endError) { setError(endError instanceof Error ? endError.message : "Could not end session."); }
    finally { setBusy(false); }
  }

  const summaryCards: SummaryCard[] = selected ? [["Eligible", selected.totalEligible, Users], ["Submitted", selected.submitted, Check], ["Taken back", selected.takenBack, Phone], ["Not reported", selected.notReported, Clock3]] : [];

  if (loading) {
    return <main className="app-grid min-h-screen px-5 py-8">
      <div className="mx-auto max-w-7xl py-20 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border-4 border-[var(--line)] border-t-[var(--ink)] animate-spin"></div>
          <p className="sans text-sm text-[var(--muted)]">Loading your sessions…</p>
        </div>
      </div>
    </main>;
  }

  return <main className="app-grid min-h-screen px-5 py-8"><div className="mx-auto max-w-7xl">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="sans text-xs font-bold uppercase tracking-[.18em] text-[var(--blue)]">Mentor workspace</p><h1 className="mt-2 text-4xl font-bold">Phone accountability</h1><p className="mt-2 sans text-sm text-[var(--muted)]">One classroom action, server-timestamped student status.</p></div><a href="/" className="rounded border border-[var(--line)] bg-white px-4 py-2 sans text-sm font-bold">Exam dashboard</a></header>
    {!loading && error && <div role="alert" className="mt-6 rounded-lg border border-[#f0c6b6] bg-[#fff5f1] p-4 sans text-sm text-[#a54627]">{error}</div>}
    <div className="mt-8 grid gap-6 lg:grid-cols-[340px_1fr]">
      <section className="rounded-xl border border-[var(--line)] bg-white p-5"><div className="flex items-center gap-2"><Plus size={18} className="text-[var(--orange)]" /><h2 className="text-xl font-bold">Start a session</h2></div><div className="mt-5 space-y-3">
          <div className="space-y-1">
            <input className={`input ${fieldErrors.title ? "border-[#b9502b]" : ""}`} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Session title" />
            {fieldErrors.title && <p className="sans text-xs text-[#b9502b]">{fieldErrors.title}</p>}
          </div>
          <div className="space-y-1">
            <select className={`input ${fieldErrors.classGroup ? "border-[#b9502b]" : ""}`} value={classGroup} onChange={(event) => setClassGroup(event.target.value)}>
              <option value="">Select squad</option>
              <option value="138">Squad 138</option>
              <option value="139">Squad 139</option>
              <option value="183">Squad 183</option>
            </select>
            {fieldErrors.classGroup && <p className="sans text-xs text-[#b9502b]">{fieldErrors.classGroup}</p>}
          </div>
          <input className="input" value={classroom} onChange={(event) => setClassroom(event.target.value)} placeholder="Classroom (optional)" />
          <button disabled={busy || !title.trim() || !classGroup.trim()} onClick={() => void create()} className="min-h-12 w-full rounded bg-[var(--orange)] px-4 sans text-sm font-bold text-white disabled:opacity-50">Start phone session</button>
        </div><div className="mt-8 border-t border-[var(--line)] pt-5"><div className="flex items-center justify-between"><h2 className="font-bold">Session history</h2><button onClick={() => void load()} aria-label="Refresh sessions" className="rounded border border-[var(--line)] p-2"><RefreshCw size={15} /></button></div><div className="mt-3 space-y-2">{sessions.map((session) => <button key={session.id} onClick={() => setSelected(session)} className={`w-full rounded border p-3 text-left ${selected?.id === session.id ? "border-[var(--blue)] bg-[var(--blue-soft)]" : "border-[var(--line)]"}`}><p className="font-bold">{session.title}</p><p className="mt-1 sans text-xs text-[var(--muted)]">{session.classGroup} · {session.status}</p></button>)}{sessions.length === 0 && <p className="sans text-sm text-[var(--muted)]">No sessions yet.</p>}</div></div></section>
      <section>{selected ? <><div className="rounded-xl border border-[var(--line)] bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><span className={`rounded-full px-3 py-1 sans text-xs font-bold uppercase ${selected.status === "active" ? "bg-[#e4f5ee] text-[var(--green)]" : "bg-slate-100 text-slate-600"}`}>{selected.status}</span><h2 className="mt-3 text-2xl font-bold">{selected.title}</h2><p className="mt-1 sans text-sm text-[var(--muted)]">{selected.classGroup}{selected.classroom ? ` · ${selected.classroom}` : ""}</p></div>{selected.status === "active" && <button disabled={busy} onClick={() => void end()} className="flex items-center gap-2 rounded bg-[var(--ink)] px-4 py-2.5 sans text-sm font-bold text-white disabled:opacity-50"><Square size={14} /> End session</button>}</div><div className="mt-6 grid gap-3 sm:grid-cols-4">{summaryCards.map(([label, value, Icon]) => <div key={label} className="rounded-lg border border-[var(--line)] p-4"><Icon size={16} className="text-[var(--blue)]" /><p className="mt-3 text-2xl font-bold">{value}</p><p className="mt-1 sans text-xs text-[var(--muted)]">{label}</p></div>)}</div></div><div className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]"><StudentTable students={students} /><Timeline events={events} /></div></> : <div className="rounded-xl border border-dashed border-[var(--line)] bg-white p-12 text-center"><Phone className="mx-auto text-[var(--blue)]" /><h2 className="mt-4 text-xl font-bold">Start or select a session</h2><p className="mt-2 sans text-sm text-[var(--muted)]">Students will see eligible active sessions at `/student`.</p></div>}</section>
    </div>
  </div></main>;
}

function StudentTable({ students }: { students: StudentPhoneStatus[] }) { return <section className="rounded-xl border border-[var(--line)] bg-white p-5"><h2 className="text-xl font-bold">Student status</h2><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[620px] text-left"><thead className="sans text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]"><tr><th className="py-3">Student</th><th className="py-3">Status</th><th className="py-3">Reason</th><th className="py-3">Updated</th></tr></thead><tbody className="divide-y divide-[var(--line)]">{students.map((student) => <tr key={student.studentId} className="sans text-sm"><td className="py-3"><p className="font-bold">{student.name}</p><p className="text-xs text-[var(--muted)]">{student.email}</p></td><td className="py-3 font-bold">{student.status.replace("_", " ")}</td><td className="py-3 text-xs text-[var(--muted)]">{student.reason ?? "—"}</td><td className="py-3 text-xs text-[var(--muted)]">{student.updatedAt ? new Date(student.updatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "—"}</td></tr>)}</tbody></table></div></section>; }
function Timeline({ events }: { events: PhoneStatusEvent[] }) { return <section className="rounded-xl border border-[var(--line)] bg-white p-5"><div className="flex items-center gap-2"><Clock3 size={17} className="text-[var(--blue)]" /><h2 className="text-xl font-bold">Activity timeline</h2></div><div className="mt-5 space-y-4">{events.map((event) => <div key={event.id} className="border-l-2 border-[var(--blue-soft)] pl-4"><p className="sans text-xs text-[var(--muted)]">{new Date(event.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p><p className="mt-1 text-sm font-bold">{event.studentName} · {event.eventType.replaceAll("_", " ")}</p>{event.reason && <p className="mt-1 sans text-xs text-[var(--muted)]">{event.reason}</p>}</div>)}{events.length === 0 && <p className="sans text-sm text-[var(--muted)]">No status events yet.</p>}</div></section>; }
