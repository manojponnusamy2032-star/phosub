import { demoExam, demoSubmissions } from "./mock-data";
import type { ExamService, SubmissionPayload } from "./types";
import { createBrowserClient } from "@supabase/ssr";
import { hasSupabasePublicConfig } from "./supabase/config";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
let currentExam = demoExam;

const mockService: ExamService = {
  async listExams() {
    return [currentExam];
  },
  async createExam(input) {
    return { ...input, id: `exam-${Date.now()}`, status: "scheduled" };
  },
  async startExam() {
    currentExam = { ...currentExam, status: "active", publicUrl: `${appUrl}/session/${currentExam.id}` };
    return currentExam;
  },
  async closeExam() {
    currentExam = { ...currentExam, status: "closed" };
    return currentExam;
  },
  async reopenExam() {
    currentExam = { ...currentExam, status: "active", publicUrl: `${appUrl}/session/${currentExam.id}` };
    return currentExam;
  },
  async getExam() {
    return currentExam;
  },
  async getSubmissions() {
    const photosSubmitted = demoSubmissions.filter((item) => item.photoStatus === "submitted").length;
    return { summary: { expected: 50, submitted: 34, pending: 16, photosSubmitted, photosMissing: demoSubmissions.length - photosSubmitted }, submissions: demoSubmissions };
  },
  async getPublicSession() {
    return { exam: currentExam, studentIdRequired: true, acceptedImageTypes: ["image/jpeg", "image/png", "image/webp"], maxUploadBytes: 5 * 1024 * 1024 };
  },
  async submitStudent(sessionId: string, payload: SubmissionPayload) {
    void sessionId;
    void payload;
    return { referenceNumber: `PH-${Math.random().toString(36).slice(2, 8).toUpperCase()}`, submittedAt: new Date().toISOString(), examTitle: demoExam.title };
  },
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, { ...options, headers: { "Content-Type": "application/json", ...options?.headers } });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(body?.error ?? "The request could not be completed.");
  }
  return response.json() as Promise<T>;
}

const liveService: ExamService = {
  listExams: () => request("/exams"),
  createExam: (input) => request("/exams", { method: "POST", body: JSON.stringify(input) }),
  startExam: (id) => request(`/exams/${id}/start`, { method: "POST" }),
  closeExam: (id) => request(`/exams/${id}/close`, { method: "POST" }),
  reopenExam: (id) => request(`/exams/${id}/reopen`, { method: "POST" }),
  getExam: (id) => request(`/exams/${id}`),
  getSubmissions: (id) => request(`/exams/${id}/submissions`),
  getPublicSession: (id) => request(`/sessions/${id}`),
  submitStudent: (id, payload) => request(`/sessions/${id}/submissions`, { method: "POST", body: JSON.stringify(payload) }),
};

const useMockAdapter = process.env.NEXT_PUBLIC_USE_MOCK_ADAPTER === "true" || (process.env.NODE_ENV !== "production" && !process.env.NEXT_PUBLIC_USE_MOCK_ADAPTER);

export async function uploadPhoto(sessionId: string, file: File) {
  if (useMockAdapter) return undefined;
  const response = await fetch("/api/uploads/sign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId, fileName: file.name, contentType: file.type, size: file.size }) });
  if (!response.ok) throw new Error("Could not prepare the photo upload.");
  const signed = await response.json() as { bucket: string; path: string; token: string };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!hasSupabasePublicConfig() || !url || !key) throw new Error("Supabase is not configured.");
  const supabase = createBrowserClient(url, key);
  const { error } = await supabase.storage.from(signed.bucket).uploadToSignedUrl(signed.path, signed.token, file);
  if (error) throw new Error("Photo upload failed.");
  return signed.path;
}

export const examService: ExamService = useMockAdapter ? mockService : liveService;