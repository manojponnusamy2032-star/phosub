import { describe, expect, it } from "vitest";
import { getTeacherAuthorizationError, isMentorRole } from "./server";

describe("teacher authorization", () => {
  it("accepts an existing mentor profile", () => {
    expect(isMentorRole("mentor")).toBe(true);
    expect(getTeacherAuthorizationError({ role: "mentor" }, null)).toBeNull();
  });

  it("rejects a student role", () => {
    expect(isMentorRole("student")).toBe(false);
    expect(getTeacherAuthorizationError({ role: "student" }, null)).toBe("Teacher access required");
  });

  it("rejects a missing profile", () => {
    expect(getTeacherAuthorizationError(null, null)).toBe("Teacher access required");
  });

  it("rejects a failed profile query", () => {
    expect(getTeacherAuthorizationError({ role: "mentor" }, new Error("RLS failure"))).toBe("Teacher access required");
  });
});