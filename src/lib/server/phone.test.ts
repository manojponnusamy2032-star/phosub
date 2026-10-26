import { describe, expect, it } from "vitest";
import { phoneSessionResponse, normalizePhoneStatus } from "./phone";

describe("phone session response", () => {
  it("counts statuses correctly", () => {
    const session = { id: "s1", mentor_id: "m1", title: "Test", class_group: "138", classroom: null, status: "active" as const, started_at: "2026-01-01T00:00:00Z", ended_at: null };
    const statuses = [
      { studentId: "a", name: "A", email: "a@x.com", status: "submitted" as const, updatedAt: "2026-01-01T00:01:00Z" },
      { studentId: "b", name: "B", email: "b@x.com", status: "not_submitted" as const, reason: "forgot", updatedAt: "2026-01-01T00:02:00Z" },
      { studentId: "c", name: "C", email: "c@x.com", status: "not_reported" as const, updatedAt: "2026-01-01T00:00:00Z" },
    ];
    const result = phoneSessionResponse(session, statuses);
    expect(result.totalEligible).toBe(3);
    expect(result.submitted).toBe(1);
    expect(result.notSubmitted).toBe(1);
    expect(result.takenBack).toBe(0);
    expect(result.notReported).toBe(1);
  });

  it("handles empty statuses", () => {
    const session = { id: "s2", mentor_id: "m1", title: "Test2", class_group: "139", classroom: "Room 1", status: "ended" as const, started_at: "2026-01-01T00:00:00Z", ended_at: "2026-01-01T01:00:00Z" };
    const result = phoneSessionResponse(session, []);
    expect(result.totalEligible).toBe(0);
    expect(result.status).toBe("ended");
    expect(result.classroom).toBe("Room 1");
  });
});

describe("normalizePhoneStatus", () => {
  it("accepts valid statuses", () => {
    expect(normalizePhoneStatus("submitted")).toBe("submitted");
    expect(normalizePhoneStatus("not_reported")).toBe("not_reported");
  });

  it("rejects invalid statuses", () => {
    expect(() => normalizePhoneStatus("invalid")).toThrow("Invalid phone status");
  });
});