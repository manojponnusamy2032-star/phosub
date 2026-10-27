import { describe, expect, it, vi, beforeEach } from "vitest";

const requireMentor = vi.fn();
const createSupabaseAdminClient = vi.fn();

vi.mock("@/lib/supabase/server", () => ({ requireMentor }));
vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient }));

function thenable(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.select = vi.fn(self);
  chain.eq = vi.fn(self);
  chain.in = vi.fn(self);
  (chain as { then?: unknown }).then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return chain;
}

async function loadRoute() {
  return await import("./route");
}

describe("phone sessions POST", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires authentication", async () => {
    requireMentor.mockRejectedValue(new Response("Authentication required", { status: 401 }));
    const { POST } = await loadRoute();
    const res = await POST(new Request("http://localhost/api/phone-sessions", { method: "POST", body: JSON.stringify({ title: "t", classGroup: "138" }) }));
    expect(res.status).toBe(401);
  });

  it("rejects invalid squad", async () => {
    requireMentor.mockResolvedValue({ supabase: { from: vi.fn() }, user: { id: "m1" }, profile: { squad: "138" } });
    const { POST } = await loadRoute();
    const res = await POST(new Request("http://localhost/api/phone-sessions", { method: "POST", body: JSON.stringify({ title: "t", classGroup: "999" }) }));
    expect(res.status).toBe(400);
  });

  it("rejects squad mismatch", async () => {
    requireMentor.mockResolvedValue({ supabase: { from: vi.fn() }, user: { id: "m1" }, profile: { squad: "138" } });
    const { POST } = await loadRoute();
    const res = await POST(new Request("http://localhost/api/phone-sessions", { method: "POST", body: JSON.stringify({ title: "t", classGroup: "139" }) }));
    expect(res.status).toBe(403);
  });

  it("rejects invalid selected students", async () => {
    const admin = {
      from: vi.fn((table: string) => {
        if (table === "student_profiles") return { select: vi.fn(() => thenable({ data: [], error: null })) };
        return {};
      }),
    };
    createSupabaseAdminClient.mockReturnValue(admin);
    requireMentor.mockResolvedValue({ supabase: { from: vi.fn() }, user: { id: "m1" }, profile: { squad: "138" } });
    const { POST } = await loadRoute();
    const res = await POST(new Request("http://localhost/api/phone-sessions", { method: "POST", body: JSON.stringify({ title: "t", classGroup: "138", studentIds: ["00000000-0000-0000-0000-000000000000"] }) }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("invalid");
  });

  it("returns 409 on duplicate active session", async () => {
    const admin = {
      from: vi.fn((table: string) => {
        if (table === "student_profiles") return { select: vi.fn(() => thenable({ data: [], error: null })) };
        return {};
      }),
    };
    createSupabaseAdminClient.mockReturnValue(admin);
    const supabase = {
      from: vi.fn(() => {
        const chain: Record<string, unknown> = {};
        chain.insert = vi.fn(() => chain);
        chain.select = vi.fn(() => chain);
        chain.single = vi.fn(() => Promise.resolve({ data: null, error: { code: "23505", message: "dup" } }));
        return chain;
      }),
    };
    requireMentor.mockResolvedValue({ supabase, user: { id: "m1" }, profile: { squad: "138" } });
    const { POST } = await loadRoute();
    const res = await POST(new Request("http://localhost/api/phone-sessions", { method: "POST", body: JSON.stringify({ title: "t", classGroup: "138" }) }));
    expect(res.status).toBe(409);
  });

  it("rolls back session on enrollment failure", async () => {
    const deleteEq = vi.fn(() => Promise.resolve({}));
    const deleteChain = { eq: deleteEq };
    const admin = {
      from: vi.fn((table: string) => {
        if (table === "student_profiles") {
          return { select: vi.fn(() => thenable({ data: [{ user_id: "s1" }], error: null })) };
        }
        if (table === "phone_session_students") {
          return { insert: vi.fn(() => Promise.resolve({ error: new Error("enroll fail") })) };
        }
        if (table === "phone_sessions") {
          return { delete: vi.fn(() => deleteChain) };
        }
        return {};
      }),
    };
    createSupabaseAdminClient.mockReturnValue(admin);
    const supabase = {
      from: vi.fn(() => {
        const chain: Record<string, unknown> = {};
        chain.insert = vi.fn(() => chain);
        chain.select = vi.fn(() => chain);
        chain.single = vi.fn(() => Promise.resolve({ data: { id: "sess1" }, error: null }));
        return chain;
      }),
    };
    requireMentor.mockResolvedValue({ supabase, user: { id: "m1" }, profile: { squad: "138" } });
    const { POST } = await loadRoute();
    const res = await POST(new Request("http://localhost/api/phone-sessions", { method: "POST", body: JSON.stringify({ title: "t", classGroup: "138" }) }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("enroll");
    expect(deleteEq).toHaveBeenCalled();
  });

  it("creates session and enrolls students", async () => {
    const admin = {
      from: vi.fn((table: string) => {
        if (table === "student_profiles") {
          return { select: vi.fn(() => thenable({ data: [{ user_id: "s1" }], error: null })) };
        }
        if (table === "phone_session_students") {
          return { insert: vi.fn(() => Promise.resolve({ error: null })) };
        }
        return {};
      }),
    };
    createSupabaseAdminClient.mockReturnValue(admin);
    const supabase = {
      from: vi.fn(() => {
        const chain: Record<string, unknown> = {};
        chain.insert = vi.fn(() => chain);
        chain.select = vi.fn(() => chain);
        chain.single = vi.fn(() => Promise.resolve({ data: { id: "sess1", title: "t" }, error: null }));
        return chain;
      }),
    };
    requireMentor.mockResolvedValue({ supabase, user: { id: "m1" }, profile: { squad: "138" } });
    const { POST } = await loadRoute();
    const res = await POST(new Request("http://localhost/api/phone-sessions", { method: "POST", body: JSON.stringify({ title: "t", classGroup: "138" }) }));
    expect(res.status).toBe(201);
  });
});
