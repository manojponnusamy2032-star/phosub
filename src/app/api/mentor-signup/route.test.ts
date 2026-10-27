import { describe, expect, it } from "vitest";

async function loadRoute() {
  return await import("./route");
}

describe("mentor signup route", () => {
  it("refuses all public mentor registration requests", async () => {
    const { POST } = await loadRoute();
    const res = await POST();
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Public mentor registration is disabled. Ask an administrator to provision your mentor account.");
  });
});
