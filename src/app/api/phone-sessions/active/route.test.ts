import { describe, expect, it, vi, beforeEach } from "vitest";

const requireStudent = vi.fn();
const createSupabaseAdminClient = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  requireStudent,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient,
}));

function makeChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.select = vi.fn(self);
  chain.eq = vi.fn(self);
  chain.in = vi.fn(self);
  chain.order = vi.fn(() => Promise.resolve(result));
  return chain;
}

async function loadRoute() {
  return await import("./route");
}

describe("active phone sessions route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires authentication", async () => {
    requireStudent.mockRejectedValue(new Response("Authentication required", { status: 401 }));
    const { GET } = await loadRoute();
    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Authentication required");
  });

  it("requires a student profile", async () => {
    requireStudent.mockRejectedValue(new Response("Student profile required", { status: 403 }));
    const { GET } = await loadRoute();
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("requires a student squad", async () => {
    requireStudent.mockResolvedValue({ user: { id: "student-1" }, profile: { squad: null } });
    const { GET } = await loadRoute();
    const res = await GET();
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Your squad has not been assigned yet. Please contact your mentor.");
  });

  it("handles enrollment database failures", async () => {
    requireStudent.mockResolvedValue({ user: { id: "student-1" }, profile: { squad: "138" } });
    const admin = { from: vi.fn() };
    // simpler: override from for phone_session_students
    admin.from = vi.fn((table: string) => {
      if (table === "phone_session_students") {
        return { select: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ data: null, error: new Error("db down") })) })) };
      }
      return { select: vi.fn(() => makeChain({ data: [], error: null })) };
    });
    createSupabaseAdminClient.mockReturnValue(admin);
    const { GET } = await loadRoute();
    const res = await GET();
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Could not load active sessions.");
  });

  it("handles session database failures", async () => {
    requireStudent.mockResolvedValue({ user: { id: "student-1" }, profile: { squad: "138" } });
    const admin = {
      from: vi.fn((table: string) => {
        if (table === "phone_session_students") {
          return { select: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ data: [{ session_id: "s1" }], error: null })) })) };
        }
        return {
          select: vi.fn(() => {
            const chain = makeChain({ data: null, error: new Error("db down") });
            // make .in/.eq/.order chain resolve to error
            return chain;
          }),
        };
      }),
    };
    createSupabaseAdminClient.mockReturnValue(admin);
    const { GET } = await loadRoute();
    const res = await GET();
    expect(res.status).toBe(400);
  });

  it("filters sessions by student squad", async () => {
    requireStudent.mockResolvedValue({ user: { id: "student-1" }, profile: { squad: "138", full_name: "Demo", college_email: "d@x.com" } });
    const sessions = [
      { id: "s1", title: "A", class_group: "138", classroom: null, status: "active", started_at: "2026-01-01T00:00:00Z" },
      { id: "s2", title: "B", class_group: "vevd", classroom: null, status: "active", started_at: "2026-01-01T00:00:00Z" },
    ];
    // mock query returns only squad-matching because .eq filter applied by DB; simulate by returning filtered
    const filtered = sessions.filter((s) => s.class_group === "138");
    const admin = {
      from: vi.fn((table: string) => {
        if (table === "phone_session_students") {
          return { select: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ data: [{ session_id: "s1" }, { session_id: "s2" }], error: null })) })) };
        }
        return {
          select: vi.fn(() => {
            const chain = makeChain({ data: filtered, error: null });
            return chain;
          }),
        };
      }),
    };
    createSupabaseAdminClient.mockReturnValue(admin);
    const { GET } = await loadRoute();
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sessions).toHaveLength(1);
    expect(body.sessions[0].class_group).toBe("138");
  });
});
