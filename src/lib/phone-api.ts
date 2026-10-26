import type { PhoneSession, PhoneSessionForm, PhoneStatusEvent, StudentPhoneStatus } from "./phone-types";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api/phone-sessions${path}`, { ...options, headers: { "Content-Type": "application/json", ...options?.headers } });
  const body = await response.json().catch(() => null) as { error?: string } | T | null;
  if (!response.ok) throw new Error((body as { error?: string } | null)?.error ?? "Phone session request failed.");
  return body as T;
}

export const phoneApi = {
  active: () => request<{ profile: { full_name: string; college_email: string }; sessions: Array<{ id: string; title: string; class_group: string; classroom: string | null; started_at: string }> }>("/active"),
  list: () => request<PhoneSession[]>(""),
  create: (input: PhoneSessionForm) => request<PhoneSession>("", { method: "POST", body: JSON.stringify(input) }),
  get: (id: string) => request<{ session: PhoneSession; students: StudentPhoneStatus[] }>(`/${id}`),
  end: (id: string) => request<PhoneSession>(`/${id}/end`, { method: "POST" }),
  events: (id: string) => request<PhoneStatusEvent[]>(`/${id}/events`),
  updateStatus: (id: string, status: "submitted" | "taken_back" | "not_submitted", reason?: string, requestId = crypto.randomUUID()) => request(`/` + `${id}/status`, { method: "POST", body: JSON.stringify({ status, reason, requestId }) }),
};