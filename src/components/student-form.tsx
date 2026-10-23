"use client";
/* eslint-disable @next/next/no-html-link-for-pages */

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowLeft, CheckCircle2, FileImage, LockKeyhole, RefreshCw, Send, Upload, X } from "lucide-react";
import { examService, uploadPhoto } from "@/lib/api";
import type { PublicSession, SubmissionReceipt } from "@/lib/types";
import { submissionSchema, type SubmissionFormValues } from "@/lib/validation";

const maxBytes = 5 * 1024 * 1024;

export default function StudentForm({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState<PublicSession>();
  const [loadError, setLoadError] = useState("");
  const [receipt, setReceipt] = useState<SubmissionReceipt>();
  const [submitError, setSubmitError] = useState("");
  const [preview, setPreview] = useState("");
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<SubmissionFormValues>({
    resolver: zodResolver(submissionSchema),
    defaultValues: { photoStatus: "submitted" },
  });
  const phoneStatus = watch("photoStatus");

  async function loadSession() {
    try {
      setLoadError("");
      setSession(await examService.getPublicSession(sessionId));
    } catch {
      setLoadError("This QR link could not be validated. Check the link or ask your teacher for a new one.");
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadSession(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const chooseFile = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > maxBytes) {
      setSubmitError("Choose a JPG, PNG, or WebP image smaller than 5 MB.");
      return;
    }
    setSubmitError("");
    setValue("photo", file, { shouldValidate: true });
    setPreview(URL.createObjectURL(file));
  };

  const onSubmit = async (values: SubmissionFormValues) => {
    setSubmitError("");
    try {
      const photoPath = values.photoStatus === "submitted" && values.photo ? await uploadPhoto(sessionId, values.photo) : undefined;
      setReceipt(await examService.submitStudent(sessionId, {
        fullName: values.fullName,
        collegeEmail: values.collegeEmail,
        studentId: values.studentId,
        photoStatus: values.photoStatus,
        reason: values.reason,
        photoPath,
      }));
    } catch {
      setSubmitError("Your submission could not be saved. Your answers are still here; check your connection and try again.");
    }
  };

  if (receipt) return <Confirmation receipt={receipt} />;
  if (loadError) return <State title="Session unavailable" message={loadError} action={<button onClick={() => void loadSession()} className="flex items-center gap-2 rounded bg-[var(--ink)] px-4 py-2.5 sans text-sm font-bold text-white"><RefreshCw size={15} /> Try again</button>} />;
  if (!session) return <State title="Checking session" message="Validating your exam link…" />;
  if (session.exam.status === "closed") return <State title="This session is closed" message="The submission window has ended. Please speak with your teacher if you need help." />;

  return <main className="app-grid min-h-screen px-4 py-6 sm:px-6 sm:py-10">
    <div className="mx-auto max-w-2xl">
      <a href="/" className="inline-flex items-center gap-2 sans text-sm font-bold text-[var(--blue)]"><ArrowLeft size={16} /> Phosub</a>
      <header className="mt-8"><p className="sans text-xs font-bold uppercase tracking-[.17em] text-[var(--blue)]">Student submission</p><h1 className="mt-2 text-4xl font-bold tracking-tight">{session.exam.title}</h1><p className="mt-2 sans text-sm text-[var(--muted)]">{session.exam.className} · Submit before {new Date(session.exam.endTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p></header>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
        <Field label="Full name" error={errors.fullName?.message}><input className="input" placeholder="Your name as registered" {...register("fullName")} /></Field>
        <Field label="College email address" error={errors.collegeEmail?.message}><input className="input" type="email" placeholder="name@college.edu" {...register("collegeEmail")} /></Field>
        {session.studentIdRequired && <Field label="Student ID" error={errors.studentId?.message}><input className="input" placeholder="e.g. CS24-001" {...register("studentId", { required: "Enter your student ID" })} /></Field>}
        <fieldset className="rounded-xl border border-[var(--line)] bg-white p-5">
          <legend className="px-1 text-lg font-bold">Phone status</legend>
          <p className="mt-1 sans text-sm text-[var(--muted)]">Tell us whether you have submitted the required phone.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="rounded-lg border border-[var(--line)] p-4"><input className="mr-2" type="radio" value="submitted" {...register("photoStatus")} />Phone submitted</label>
            <label className="rounded-lg border border-[var(--line)] p-4"><input className="mr-2" type="radio" value="not_submitted" {...register("photoStatus")} />Phone not submitted</label>
          </div>
        </fieldset>
        {phoneStatus === "submitted" ? <Field label="Upload phone image" hint="JPG, PNG, or WebP · Max 5 MB" error={errors.photo?.message}><UploadField preview={preview} fileName={watch("photo")?.name} onChoose={chooseFile} onRemove={() => { setPreview(""); setValue("photo", undefined); }} /></Field> : <Field label="Reason for not submitting the phone" error={errors.reason?.message}><textarea className="input min-h-28 resize-y" placeholder="Briefly tell us what happened" {...register("reason")} /></Field>}
        {submitError && <div role="alert" className="flex items-start gap-2 rounded-lg border border-[#f0c6b6] bg-[#fff5f1] p-4 sans text-sm text-[#a54627]"><AlertCircle size={18} className="mt-0.5 shrink-0" />{submitError}</div>}
        <div className="rounded-lg bg-[#eef4f7] p-4 sans text-xs leading-5 text-[var(--muted)]"><strong className="text-[var(--ink)]">Privacy notice.</strong> Your name, college email, student ID, and phone status are collected for examination records. Only authorized examination staff can access them.</div>
        <button disabled={isSubmitting} className="flex min-h-12 w-full items-center justify-center gap-2 rounded bg-[var(--orange)] px-5 sans text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60">{isSubmitting ? "Submitting…" : <><Send size={16} /> Submit exam form</>}</button>
      </form>
    </div>
  </main>;
}

function UploadField({ preview, fileName, onChoose, onRemove }: { preview: string; fileName?: string; onChoose: (file?: File) => void; onRemove: () => void }) {
  return <div className="rounded-xl border border-dashed border-[var(--line)] bg-white p-5">{preview ? <div className="flex items-center gap-4"><img src={preview} alt="Selected phone image preview" className="h-16 w-16 rounded object-cover" /><div className="min-w-0 flex-1"><p className="truncate sans text-sm font-bold">{fileName}</p><p className="mt-1 sans text-xs text-[var(--muted)]">Ready to upload</p></div><button type="button" onClick={onRemove} className="rounded border border-[var(--line)] p-2" aria-label="Remove selected phone image"><X size={16} /></button></div> : <label className="flex cursor-pointer flex-col items-center gap-2 py-4 text-center"><Upload className="text-[var(--blue)]" /><span className="sans text-sm font-bold text-[var(--blue)]">Choose a phone image</span><input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => onChoose(event.target.files?.[0])} /></label>}</div>;
}

function Confirmation({ receipt }: { receipt: SubmissionReceipt }) { return <main className="app-grid flex min-h-screen items-center justify-center px-5 py-10"><section className="w-full max-w-lg rounded-2xl border border-[var(--line)] bg-white p-7 text-center shadow-sm"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#e4f5ee] text-[var(--green)]"><CheckCircle2 size={32} /></div><p className="mt-6 sans text-xs font-bold uppercase tracking-[.18em] text-[var(--green)]">Submission received</p><h1 className="mt-2 text-3xl font-bold">You are all set.</h1><p className="mt-3 sans text-sm leading-6 text-[var(--muted)]">Your response for <strong className="text-[var(--ink)]">{receipt.examTitle}</strong> was recorded at {new Date(receipt.submittedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.</p><div className="mt-6 border border-dashed border-[var(--line)] bg-[#fbfcfc] p-4"><p className="sans text-[10px] font-bold uppercase tracking-[.15em] text-[var(--muted)]">Reference number</p><p className="mt-1 font-mono text-xl font-bold tracking-wider">{receipt.referenceNumber}</p></div><p className="mt-6 flex items-center justify-center gap-2 sans text-xs text-[var(--muted)]"><LockKeyhole size={13} /> Keep this reference for your records.</p></section></main>; }
function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) { return <label className="block rounded-xl border border-[var(--line)] bg-white p-5"><span className="text-lg font-bold">{label}</span>{hint && <span className="mt-1 block sans text-xs text-[var(--muted)]">{hint}</span>}<span className="mt-3 block">{children}</span>{error && <span role="alert" className="mt-2 block sans text-xs font-bold text-[#b9502b]">{error}</span>}</label>; }
function State({ title, message, action }: { title: string; message: string; action?: React.ReactNode }) { return <main className="app-grid flex min-h-screen items-center justify-center px-5"><section className="max-w-md rounded-2xl border border-[var(--line)] bg-white p-8 text-center"><FileImage className="mx-auto text-[var(--blue)]" size={32} /><h1 className="mt-5 text-2xl font-bold">{title}</h1><p className="mt-2 sans text-sm leading-6 text-[var(--muted)]">{message}</p>{action && <div className="mt-6 flex justify-center">{action}</div>}</section></main>; }
