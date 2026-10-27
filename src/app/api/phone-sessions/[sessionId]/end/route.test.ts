import { describe, expect, it, vi, beforeEach } from "vitest";

const requireMentor = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ requireMentor }));

async function loadRoute() {
  return await import("./route");
}

describe("end phone session route", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires authentication", async () => {
    requireMentor.mockRejectedValue(new Response("Authentication required", { status: 401 }));
    const { POST } = await loadRoute();
    const res = await POST(new Request("http://localhost/x", { method: "POST" }), { params: Promise.resolve({ sessionId: "s1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 409 when already ended", async () => {
    const supabase = {
      from: vi.fn(() => {
        const chain: Record<string, unknown> = {};
        chain.update = vi.fn(() => chain);
        chain.eq = vi.fn(() => chain);
        chain.select = vi.fn(() => chain);
        chain.single = vi.fn(() => Promise.resolve({ data: null, error: { message: "no rows" } }));
        return chain;
      }),
    };
    requireMentor.mockResolvedValue({ supabase, user: { id: "m1" }, profile: { role: "mentor" } });
    const { POST } = await loadRoute();
    const res = await POST(new Request("http://localhost/x", { method: "POST" }), { params: Promise.resolve({ sessionId: "s1" }) });
    expect(res.status).toBe(409);
  });

  it("ends active session", async () => {
    const supabase = {
      from: vi.fn(() => {
        const chain: Record<string, unknown> = {};
        chain.update = vi.fn(() => chain);
        chain.eq = vi.fn(() => chain);
        chain.select = vi.fn(() => chain);
        chain.single = vi.fn(() => Promise.resolve({ data: { id: "s1", status: "ended" }, error: null }));
        return chain;
      }),
    };
    requireMentor.mockResolvedValue({ supabase, user: { id: "m1" }, profile: { role: "mentor" } });
    const { POST } = await loadRoute();
    const res = await POST(new Request("http://localhost/x", { method: "POST" }), { params: Promise.resolve({ sessionId: "s1" }) });
    expect(res.status).toBe(200);
  });
});
