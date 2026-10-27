import { beforeEach, describe, expect, it, vi } from "vitest";

const requireTeacher = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ requireTeacher }));

async function loadRoute() {
  return await import("./route");
}

describe("staff auth route", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(["mentor", "teacher"])("returns the authenticated %s profile", async (role) => {
    requireTeacher.mockResolvedValue({ user: { id: "staff-1" }, profile: { role } });
    const { GET } = await loadRoute();

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: "staff-1", role });
  });

  it("returns the authorization error for an unapproved account", async () => {
    requireTeacher.mockRejectedValue(new Response("Teacher access required", { status: 403 }));
    const { GET } = await loadRoute();

    const response = await GET();

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Teacher access required" });
  });
});