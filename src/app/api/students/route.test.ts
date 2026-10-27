import { describe, expect, it, vi, beforeEach } from "vitest";

const requireMentor = vi.fn();
const createSupabaseAdminClient = vi.fn();

vi.mock("@/lib/supabase/server", () => ({ requireMentor }));
vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient }));

async function loadRoute() {
  return await import("./route");
}

describe("students route", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires authentication", async () => {
    requireMentor.mockRejectedValue(new Response("Authentication required", { status: 401 }));
    const { POST } = await loadRoute();
    const res = await POST(new Request("http://localhost/api/students", { method: "POST", body: JSON.stringify({ full_name: "Student", college_email: "s@example.com", password: "password123" }) }));
    expect(res.status).toBe(401);
  });

  it("rejects invalid student details", async () => {
    requireMentor.mockResolvedValue({ supabase: { from: vi.fn() }, user: { id: "m1" }, profile: { squad: "138" } });
    const { POST } = await loadRoute();
    const res = await POST(new Request("http://localhost/api/students", { method: "POST", body: JSON.stringify({ full_name: "S", college_email: "bad", password: "short" }) }));
    expect(res.status).toBe(400);
  });

  it("creates a student with the mentor squad", async () => {
    const insert = vi.fn(() => Promise.resolve({ error: null }));
    const admin = {
      auth: { admin: { createUser: vi.fn(() => Promise.resolve({ data: { user: { id: "stu1" } }, error: null })), deleteUser: vi.fn() } },
      from: vi.fn(() => ({ insert })),
    };
    createSupabaseAdminClient.mockReturnValue(admin);
    requireMentor.mockResolvedValue({ supabase: { from: vi.fn() }, user: { id: "m1" }, profile: { squad: "138" } });
    const { POST } = await loadRoute();
    const res = await POST(new Request("http://localhost/api/students", { method: "POST", body: JSON.stringify({ full_name: "Student Name", college_email: "S@Example.com", password: "password123" }) }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({ id: "stu1", squad: "138" });
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ squad: "138", college_email: "S@Example.com" }));
  });
});