export type ExamStatus = "scheduled" | "active" | "closed";
export type PhotoStatus = "submitted" | "not_submitted";
export type SubmissionStatus = "submitted" | "pending" | "failed";

export interface Exam {
  id: string;
  title: string;
  className: string;
  expectedCount: number;
  studentIdRequired: boolean;
  startTime: string;
  endTime: string;
  status: ExamStatus;
  publicUrl?: string;
}

export interface Submission {
  id: string;
  studentId: string;
  name: string;
  email: string;
  formStatus: SubmissionStatus;
  photoStatus: PhotoStatus;
  reason?: string;
  submittedAt?: string;
}

export interface ExamSummary {
  expected: number;
  submitted: number;
  pending: number;
  photosSubmitted: number;
  photosMissing: number;
}

export interface SubmissionPayload {
  fullName: string;
  collegeEmail: string;
  studentId?: string;
  photoStatus: PhotoStatus;
  photoPath?: string;
  reason?: string;
}

export interface PublicSession {
  exam: Pick<Exam, "id" | "title" | "className" | "endTime" | "status">;
  studentIdRequired: boolean;
  acceptedImageTypes: string[];
  maxUploadBytes: number;
}

export interface SubmissionReceipt {
  referenceNumber: string;
  submittedAt: string;
  examTitle: string;
}

export interface ExamService {
  createExam(input: Omit<Exam, "id" | "status" | "publicUrl">): Promise<Exam>;
  startExam(examId: string): Promise<Exam>;
  closeExam(examId: string): Promise<Exam>;
  reopenExam(examId: string): Promise<Exam>;
  getExam(examId: string): Promise<Exam>;
  getSubmissions(examId: string): Promise<{ summary: ExamSummary; submissions: Submission[] }>;
  getPublicSession(sessionId: string): Promise<PublicSession>;
  submitStudent(sessionId: string, payload: SubmissionPayload): Promise<SubmissionReceipt>;
}