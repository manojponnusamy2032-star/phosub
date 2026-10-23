import { describe, expect, it } from "vitest";
import { submissionSchema } from "./validation";

describe("submissionSchema", () => {
  const base = { fullName: "Aarav Sharma", collegeEmail: "aarav@college.edu", photoStatus: "submitted" as const };

  it("requires a photo when photo status is submitted", () => {
    const result = submissionSchema.safeParse(base);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.flatten().fieldErrors.photo).toContain("Choose an image to upload");
  });

  it("requires a reason when photo status is not submitted", () => {
    const result = submissionSchema.safeParse({ ...base, photoStatus: "not_submitted" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.flatten().fieldErrors.reason).toContain("Tell us why the photo was not submitted");
  });

  it("accepts a not-submitted response with a reason", () => {
    const result = submissionSchema.safeParse({ ...base, photoStatus: "not_submitted", reason: "Camera unavailable" });
    expect(result.success).toBe(true);
  });
});
