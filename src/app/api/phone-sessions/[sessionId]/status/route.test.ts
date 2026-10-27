import { describe, expect, it, vi, beforeEach } from "vitest";

const requireStudent = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ requireStudent }));

async function loadRoute() {
  return await import("./route");
}

describe("phone status route", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires authentication", async () => {
    requireStudent.mockRejectedValue(new Response("Authentication required", { status: 401 }));
    const { POST } = await loadRoute();
    const res = await POST(new Request("http://localhost/api/phone-sessions/s1/status", { method: "POST", body: JSON.stringify({ status: "submitted" }) }), { params: Promise.resolve({ sessionId: "s1" }) });
    expect(res.status).toBe(401);
  });

  it("rejects invalid status", async () => {
    const supabase = { rpc: vi.fn() };
    requireStudent.mockResolvedValue({ supabase, user: { id: "s1" }, profile: { squad: "138" } });
    const { POST } = await loadRoute();
    const res = await POST(new Request("http://localhost/api/phone-sessions/s1/status", { method: "POST", body: JSON.stringify({ status: "bogus" }) }), { params: Promise.resolve({ sessionId: "s1" }) });
    expect(res.status).toBe(400);
  });

  it("returns rpc result on success", async () => {
    const rpc = vi.fn(() => Promise.resolve({ data: { current_status: "submitted" }, error: null }));
    const supabase = { rpc };
    requireStudent.mockResolvedValue({ supabase, user: { id: "s1" }, profile: { squad: "138" } });
    const { POST } = await loadRoute();
    const res = await POST(new Request("http://localhost/api/phone-sessions/s1/status", { method: "POST", body: JSON.stringify({ status: "submitted" }) }), { params: Promise.resolve({ sessionId: "s1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.current_status).toBe("submitted");
  });
});
