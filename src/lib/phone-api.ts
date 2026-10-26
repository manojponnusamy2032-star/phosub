import type { PhoneSession, PhoneSessionForm, PhoneStatusEvent, StudentPhoneStatus } from "./phone-types";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`/api/phone-sessions${path}`, { ...options, headers: { "Content-Type": "application/json", ...options?.headers }, signal: controller.signal });
    clearTimeout(timeout);
    const body = await response.json().catch(() => null) as { error?: string; issues?: unknown } | T | null;
    if (!response.ok) {
      const message = (body as { error?: string; issues?: unknown } | null)?.error ?? "Phone session request failed.";
      const issues = (body as { error?: string; issues?: unknown } | null)?.issues;
      const err = new Error(message) as Error & { issues?: unknown };
      err.issues = issues;
      throw err;
    }
    return body as T;
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof DOMException && err.name === "AbortError") throw new Error("Request timed out. Please try again.");
    throw err;
  }
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