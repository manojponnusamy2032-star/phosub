import { demoExam, demoSubmissions } from "./mock-data";
import type { ExamService, SubmissionPayload } from "./types";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
let currentExam = demoExam;

const mockService: ExamService = {
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
  if (!response.ok) throw new Error("The request could not be completed.");
  return response.json() as Promise<T>;
}

const liveService: ExamService = {
  createExam: (input) => request("/exams", { method: "POST", body: JSON.stringify(input) }),
  startExam: (id) => request(`/exams/${id}/start`, { method: "POST" }),
  closeExam: (id) => request(`/exams/${id}/close`, { method: "POST" }),
  reopenExam: (id) => request(`/exams/${id}/reopen`, { method: "POST" }),
  getExam: (id) => request(`/exams/${id}`),
  getSubmissions: (id) => request(`/exams/${id}/submissions`),
  getPublicSession: (id) => request(`/sessions/${id}`),
  submitStudent: (id, payload) => request(`/sessions/${id}/submissions`, { method: "POST", body: JSON.stringify(payload) }),
};

const useMockAdapter = process.env.NEXT_PUBLIC_USE_MOCK_ADAPTER !== "false";

export const examService: ExamService = useMockAdapter ? mockService : liveService;