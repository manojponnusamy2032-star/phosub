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

  it("rejects taken_back without a reason", async () => {
    const rpc = vi.fn();
    const supabase = { rpc };
    requireStudent.mockResolvedValue({ supabase, user: { id: "s1" }, profile: { squad: "138" } });
    const { POST } = await loadRoute();
    const res = await POST(new Request("http://localhost/api/phone-sessions/s1/status", { method: "POST", body: JSON.stringify({ status: "taken_back" }) }), { params: Promise.resolve({ sessionId: "s1" }) });
    expect(res.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("returns rpc result on success", async () => {
    const rpc = vi.fn(() => Promise.resolve({ data: { current_status: "submitted", updated_at: "2026-01-01T00:00:00Z" }, error: null }));
    const supabase = { rpc };
    requireStudent.mockResolvedValue({ supabase, user: { id: "s1" }, profile: { squad: "138" } });
    const { POST } = await loadRoute();
    const res = await POST(new Request("http://localhost/api/phone-sessions/s1/status", { method: "POST", body: JSON.stringify({ status: "submitted" }) }), { params: Promise.resolve({ sessionId: "s1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.current_status).toBe("submitted");
  });

  it("returns taken_back when a reason is provided", async () => {
    const rpc = vi.fn(() => Promise.resolve({ data: { current_status: "taken_back", updated_at: "2026-01-01T00:01:00Z" }, error: null }));
    const supabase = { rpc };
    requireStudent.mockResolvedValue({ supabase, user: { id: "s1" }, profile: { squad: "138" } });
    const { POST } = await loadRoute();
    const res = await POST(new Request("http://localhost/api/phone-sessions/s1/status", { method: "POST", body: JSON.stringify({ status: "taken_back", reason: "Needed for lab" }) }), { params: Promise.resolve({ sessionId: "s1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.current_status).toBe("taken_back");
    expect(rpc).toHaveBeenCalledWith("transition_phone_status", expect.objectContaining({ p_new_status: "taken_back", p_reason: "Needed for lab" }));
  });

  it("allows submitting again after taken back", async () => {
    const rpc = vi.fn(() => Promise.resolve({ data: { current_status: "submitted", updated_at: "2026-01-01T00:02:00Z" }, error: null }));
    const supabase = { rpc };
    requireStudent.mockResolvedValue({ supabase, user: { id: "s1" }, profile: { squad: "138" } });
    const { POST } = await loadRoute();
    const res = await POST(new Request("http://localhost/api/phone-sessions/s1/status", { method: "POST", body: JSON.stringify({ status: "submitted" }) }), { params: Promise.resolve({ sessionId: "s1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.current_status).toBe("submitted");
  });

  it("rejects unauthorized students", async () => {
    const rpc = vi.fn(() => Promise.resolve({ data: null, error: { message: "Student is not eligible for this session" } }));
    const supabase = { rpc };
    requireStudent.mockResolvedValue({ supabase, user: { id: "s1" }, profile: { squad: "138" } });
    const { POST } = await loadRoute();
    const res = await POST(new Request("http://localhost/api/phone-sessions/s1/status", { method: "POST", body: JSON.stringify({ status: "submitted" }) }), { params: Promise.resolve({ sessionId: "s1" }) });
    expect(res.status).toBe(409);
  });

  it("rejects changes after a session ends", async () => {
    const rpc = vi.fn(() => Promise.resolve({ data: null, error: { message: "Session is not active" } }));
    const supabase = { rpc };
    requireStudent.mockResolvedValue({ supabase, user: { id: "s1" }, profile: { squad: "138" } });
    const { POST } = await loadRoute();
    const res = await POST(new Request("http://localhost/api/phone-sessions/s1/status", { method: "POST", body: JSON.stringify({ status: "submitted" }) }), { params: Promise.resolve({ sessionId: "s1" }) });
    expect(res.status).toBe(409);
  });
});
