import { describe, expect, it } from "vitest";
import { phoneSessionSchema, phoneStatusSchema } from "./validation";

describe("phone workflow validation", () => {
  it("requires a reason for phone pickup and non-submission", () => {
    expect(phoneStatusSchema.safeParse({ status: "taken_back" }).success).toBe(false);
    expect(phoneStatusSchema.safeParse({ status: "not_submitted" }).success).toBe(false);
    expect(phoneStatusSchema.safeParse({ status: "taken_back", reason: "Emergency" }).success).toBe(true);
  });

  it("allows a submitted status without a reason", () => {
    expect(phoneStatusSchema.safeParse({ status: "submitted" }).success).toBe(true);
  });

  it("limits session metadata to usable values", () => {
    expect(phoneSessionSchema.safeParse({ title: "Morning exam", classGroup: "CSE A" }).success).toBe(true);
    expect(phoneSessionSchema.safeParse({ title: "", classGroup: "CSE A" }).success).toBe(false);
  });
});
