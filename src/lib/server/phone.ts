import type { PhoneSession, PhoneStatus, StudentPhoneStatus } from "@/lib/phone-types";

type SessionRow = { id: string; mentor_id: string; title: string; class_group: string; classroom: string | null; status: "active" | "ended"; started_at: string; ended_at: string | null };

export function phoneSessionResponse(session: SessionRow, statuses: StudentPhoneStatus[]): PhoneSession {
  return { id: session.id, title: session.title, classGroup: session.class_group, classroom: session.classroom ?? undefined, mentorId: session.mentor_id, status: session.status, startedAt: session.started_at, endedAt: session.ended_at ?? undefined, totalEligible: statuses.length, submitted: statuses.filter((item) => item.status === "submitted").length, notSubmitted: statuses.filter((item) => item.status === "not_submitted").length, takenBack: statuses.filter((item) => item.status === "taken_back").length, notReported: statuses.filter((item) => item.status === "not_reported").length };
}

export function normalizePhoneStatus(value: string): PhoneStatus {
  if (!["not_reported", "submitted", "taken_back", "not_submitted"].includes(value)) throw new Error("Invalid phone status");
  return value as PhoneStatus;
}