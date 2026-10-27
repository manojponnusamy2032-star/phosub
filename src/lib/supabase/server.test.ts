import { beforeEach, describe, expect, it, vi } from "vitest";

const authGetUser = vi.fn();
const createSupabaseAdminClient = vi.fn();
const serverFrom = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({ getAll: () => [] })),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: authGetUser },
    from: serverFrom,
  })),
}));

vi.mock("./admin", () => ({
  createSupabaseAdminClient,
}));

async function loadServer() {
  return await import("./server");
}

describe("requireTeacher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  });

  it.each(["mentor", "teacher"])("accepts a %s profile", async (role) => {
    authGetUser.mockResolvedValue({ data: { user: { id: "staff-1", email: "staff@example.com" } }, error: null });
    createSupabaseAdminClient.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: { role, squad: "138" }, error: null })) })),
        })),
      })),
    });

    const { requireTeacher } = await loadServer();
    const result = await requireTeacher();

    expect(result.profile).toMatchObject({ role, squad: "138" });
  });

  it("returns forbidden when no staff profile exists", async () => {
    authGetUser.mockResolvedValue({ data: { user: { id: "staff-1" } }, error: null });
    createSupabaseAdminClient.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: null, error: null })) })) })),
      })),
    });

    const { requireTeacher } = await loadServer();
    const error = await requireTeacher().catch((caught) => caught);

    expect(error).toBeInstanceOf(Response);
    expect((error as Response).status).toBe(403);
  });

  it("returns a server error when the staff profile lookup fails", async () => {
    authGetUser.mockResolvedValue({ data: { user: { id: "staff-1" } }, error: null });
    createSupabaseAdminClient.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: null, error: new Error("db unavailable") })) })) })),
      })),
    });

    const { requireTeacher } = await loadServer();
    const error = await requireTeacher().catch((caught) => caught);

    expect(error).toBeInstanceOf(Response);
    expect((error as Response).status).toBe(500);
  });
});

describe("requireStudent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  });

  it("rejects a student profile that would be created with no squad", async () => {
    authGetUser.mockResolvedValue({ data: { user: { id: "user-1", email: "student@example.com", user_metadata: {} } }, error: null });
    serverFrom.mockImplementation((table: string) => {
      if (table === "student_profiles") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({ data: null, error: null })),
            })),
          })),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    const insert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(async () => ({ data: { user_id: "user-1", full_name: "Student", college_email: "student@example.com", squad: null }, error: null })),
      })),
    }));

    createSupabaseAdminClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "teacher_profiles") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({ data: null, error: null })),
              })),
            })),
          };
        }
        if (table === "student_profiles") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({ data: null, error: null })),
              })),
              ilike: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: null, error: null })) })),
            })),
            insert,
          };
        }
        throw new Error(`Unexpected admin table: ${table}`);
      }),
    });

    const { requireStudent } = await loadServer();
    const res = await requireStudent().catch((error) => error);

    expect(res).toBeInstanceOf(Response);
    expect((res as Response).status).toBe(403);
    expect(insert).not.toHaveBeenCalled();
  });

  it("repairs an existing profile by email when the auth user was created later", async () => {
    authGetUser.mockResolvedValue({ data: { user: { id: "user-2", email: "repair@example.com", user_metadata: {} } }, error: null });
    const adminFrom = vi.fn((table: string) => {
      if (table === "teacher_profiles") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({ data: null, error: null })),
            })),
          })),
        };
      }
      if (table === "student_profiles") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn((column: string) => {
              if (column === "user_id") return { maybeSingle: vi.fn(async () => ({ data: null, error: null })) };
              return { maybeSingle: vi.fn(async () => ({ data: null, error: null })) };
            }),
            ilike: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: { user_id: "old-user", full_name: "Repair", college_email: "REPAIR@EXAMPLE.COM", squad: "138", role: "student" }, error: null })) })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(async () => ({ data: { user_id: "user-2", full_name: "Repair", college_email: "repair@example.com", squad: "138", role: "student" }, error: null })),
              })),
            })),
          })),
        };
      }
      throw new Error(`Unexpected admin table: ${table}`);
    });
    serverFrom.mockImplementation((table: string) => {
      if (table === "student_profiles") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({ data: null, error: null })),
            })),
          })),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    });
    createSupabaseAdminClient.mockReturnValue({ from: adminFrom });

    const { requireStudent } = await loadServer();
    const result = await requireStudent();

    expect(result.profile).toMatchObject({ user_id: "user-2", college_email: "repair@example.com", squad: "138" });
  });
});
