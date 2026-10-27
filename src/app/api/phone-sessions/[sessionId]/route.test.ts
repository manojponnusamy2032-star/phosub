import { describe, expect, it, vi, beforeEach } from "vitest";

const requireMentor = vi.fn();
const requireStudent = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ requireMentor, requireStudent }));

async function loadRoute() {
  return await import("./route");
}

describe("phone session detail route", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires authentication", async () => {
    requireMentor.mockRejectedValue(new Response("Authentication required", { status: 401 }));
    requireStudent.mockRejectedValue(new Response("Authentication required", { status: 401 }));
    const { GET } = await loadRoute();
    const res = await GET(new Request("http://localhost/x"), { params: Promise.resolve({ sessionId: "s1" }) });
    expect(res.status).toBe(401);
  });

  it("rejects students from a different squad", async () => {
    const from = vi.fn((table: string) => {
      if (table === "phone_sessions") {
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn(async () => ({ data: { id: "s1", class_group: "138", status: "active" }, error: null })) })) })) })) };
      }
      return {};
    });
    requireMentor.mockRejectedValue(new Response("Mentor access required", { status: 403 }));
    requireStudent.mockResolvedValue({ supabase: { from }, user: { id: "stu1" }, profile: { squad: "139" } });

    const { GET } = await loadRoute();
    const res = await GET(new Request("http://localhost/x"), { params: Promise.resolve({ sessionId: "s1" }) });

    expect(res.status).toBe(403);
    expect(from).not.toHaveBeenCalledWith("phone_session_students");
  });

  it("returns updated status and counts for a mentor", async () => {
    const sessionRow = { id: "s1", mentor_id: "m1", title: "T", class_group: "138", classroom: null, status: "active", started_at: "2026-01-01T00:00:00Z", ended_at: null };
    const enrollments = [
      { student_id: "stu1", student_profiles: { full_name: "Student One", college_email: "s1@x.com" } },
      { student_id: "stu2", student_profiles: { full_name: "Student Two", college_email: "s2@x.com" } },
    ];
    const statusRows = [
      { student_id: "stu1", current_status: "submitted", current_reason: null, updated_at: "2026-01-01T00:01:00Z" },
      { student_id: "stu2", current_status: "taken_back", current_reason: "needed", updated_at: "2026-01-01T00:02:00Z" },
    ];
    let studentCall = 0;
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "phone_sessions") {
          return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: sessionRow, error: null })) })) })) };
        }
        if (table === "phone_session_students") {
          studentCall += 1;
          if (studentCall === 1) {
            return { select: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ data: enrollments, error: null })) })) };
          }
          return { select: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ count: enrollments.length, error: null })) })) };
        }
        if (table === "phone_statuses") {
          return { select: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ data: statusRows, error: null })) })) };
        }
        return {};
      }),
    };
    requireMentor.mockResolvedValue({ supabase, user: { id: "m1" }, profile: { role: "mentor" } });
    const { GET } = await loadRoute();
    const res = await GET(new Request("http://localhost/x"), { params: Promise.resolve({ sessionId: "s1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.session.submitted).toBe(1);
    expect(body.session.takenBack).toBe(1);
    expect(body.session.notReported).toBe(0);
    expect(body.students[0].status).toBe("submitted");
    expect(body.students[0].updatedAt).toBe("2026-01-01T00:01:00Z");
    expect(body.students[1].reason).toBe("needed");
  });

  it("reports enrollment query failures instead of returning not_reported", async () => {
    const sessionRow = { id: "s1", mentor_id: "m1", title: "T", class_group: "138", classroom: null, status: "active", started_at: "2026-01-01T00:00:00Z", ended_at: null };
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "phone_sessions") {
          return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: sessionRow, error: null })) })) })) };
        }
        if (table === "phone_session_students") {
          return { select: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ data: null, error: new Error("db down") })) })) };
        }
        if (table === "phone_statuses") {
          return { select: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ data: [], error: null })) })) };
        }
        return {};
      }),
    };
    requireMentor.mockResolvedValue({ supabase, user: { id: "m1" }, profile: { role: "mentor" } });
    const { GET } = await loadRoute();
    const res = await GET(new Request("http://localhost/x"), { params: Promise.resolve({ sessionId: "s1" }) });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Could not load session enrollment.");
  });

  it("reports phone status query failures instead of returning not_reported", async () => {
    const sessionRow = { id: "s1", mentor_id: "m1", title: "T", class_group: "138", classroom: null, status: "active", started_at: "2026-01-01T00:00:00Z", ended_at: null };
    const enrollments = [
      { student_id: "stu1", student_profiles: { full_name: "Student One", college_email: "s1@x.com" } },
    ];
    let studentCall = 0;
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "phone_sessions") {
          return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: sessionRow, error: null })) })) })) };
        }
        if (table === "phone_session_students") {
          studentCall += 1;
          if (studentCall === 1) {
            return { select: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ data: enrollments, error: null })) })) };
          }
          return { select: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ count: enrollments.length, error: null })) })) };
        }
        if (table === "phone_statuses") {
          return { select: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ data: null, error: new Error("db down") })) })) };
        }
        return {};
      }),
    };
    requireMentor.mockResolvedValue({ supabase, user: { id: "m1" }, profile: { role: "mentor" } });
    const { GET } = await loadRoute();
    const res = await GET(new Request("http://localhost/x"), { params: Promise.resolve({ sessionId: "s1" }) });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Could not load phone statuses.");
  });
});
