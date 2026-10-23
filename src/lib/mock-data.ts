import type { Exam, Submission } from "./types";

export const demoExam: Exam = {
  id: "demo-midterm",
  title: "Data Structures · Midterm",
  className: "CSE 204 · Section B",
  expectedCount: 50,
  studentIdRequired: true,
  startTime: "2026-10-23T09:00:00",
  endTime: "2026-10-23T11:30:00",
  status: "active",
  publicUrl: "http://localhost:3000/session/demo-midterm",
};

export const demoSubmissions: Submission[] = [
  { id: "sub-001", studentId: "CS24-001", name: "Aarav Sharma", email: "aarav.sharma@northbridge.edu", formStatus: "submitted", photoStatus: "submitted", submittedAt: "2026-10-23T09:18:00" },
  { id: "sub-002", studentId: "CS24-002", name: "Meera Iyer", email: "meera.iyer@northbridge.edu", formStatus: "submitted", photoStatus: "not_submitted", reason: "Camera unavailable", submittedAt: "2026-10-23T09:21:00" },
  { id: "sub-003", studentId: "CS24-003", name: "Kabir Menon", email: "kabir.menon@northbridge.edu", formStatus: "submitted", photoStatus: "submitted", submittedAt: "2026-10-23T09:26:00" },
  { id: "sub-004", studentId: "CS24-004", name: "Diya Nair", email: "diya.nair@northbridge.edu", formStatus: "submitted", photoStatus: "submitted", submittedAt: "2026-10-23T09:29:00" },
  { id: "sub-005", studentId: "CS24-005", name: "Rohan Das", email: "rohan.das@northbridge.edu", formStatus: "submitted", photoStatus: "not_submitted", reason: "Device issue", submittedAt: "2026-10-23T09:32:00" },
];