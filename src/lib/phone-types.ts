export type PhoneSessionStatus = "active" | "ended";
export type PhoneStatus = "not_reported" | "submitted" | "taken_back" | "not_submitted";

export interface PhoneSession {
  id: string;
  title: string;
  classGroup: string;
  classroom?: string;
  mentorId: string;
  status: PhoneSessionStatus;
  startedAt: string;
  endedAt?: string;
  totalEligible: number;
  submitted: number;
  notSubmitted: number;
  takenBack: number;
  notReported: number;
}

export interface StudentPhoneStatus {
  studentId: string;
  name: string;
  email: string;
  status: PhoneStatus;
  reason?: string;
  updatedAt?: string;
}

export interface PhoneStatusEvent {
  id: string;
  studentId: string;
  studentName: string;
  eventType: string;
  previousStatus?: PhoneStatus;
  newStatus: PhoneStatus;
  reason?: string;
  createdAt: string;
}

export interface PhoneSessionForm {
  title: string;
  classGroup: string;
  classroom?: string;
  studentIds?: string[];
}