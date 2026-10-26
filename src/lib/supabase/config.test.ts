import { describe, expect, it } from "vitest";
import { hasSupabasePublicConfig, validateSupabaseUrl } from "./config";

describe("supabase config", () => {
  it("rejects placeholder URL", () => {
    const orig = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const origKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://your-project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "your-anon-key";
    expect(hasSupabasePublicConfig()).toBe(false);
    process.env.NEXT_PUBLIC_SUPABASE_URL = orig;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = origKey;
  });

  it("rejects invalid URL", () => {
    expect(validateSupabaseUrl("not-a-url")).toEqual({ valid: false, reason: "URL is not a valid URL" });
    expect(validateSupabaseUrl("")).toEqual({ valid: false, reason: "URL is missing" });
    expect(validateSupabaseUrl("https://your-project.supabase.co")).toEqual({ valid: false, reason: "URL is a placeholder" });
  });

  it("accepts valid URL", () => {
    expect(validateSupabaseUrl("https://example.supabase.co")).toEqual({ valid: true });
  });
});