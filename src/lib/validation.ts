import { z } from "zod";

export const examSchema = z.object({
  title: z.string().trim().min(3, "Enter an exam title"),
  className: z.string().trim().min(1, "Enter a class or section"),
  expectedCount: z.coerce.number().int().min(1).max(50),
  startTime: z.string().min(1, "Choose a start time"),
  endTime: z.string().min(1, "Choose an end time"),
  studentIdRequired: z.boolean(),
}).superRefine((data, context) => {
  if (new Date(data.endTime).getTime() <= new Date(data.startTime).getTime()) context.addIssue({ code: z.ZodIssueCode.custom, path: ["endTime"], message: "End time must be after start time" });
});

export const submissionSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name"),
    collegeEmail: z.string().trim().email("Enter a valid college email address"),
    studentId: z.string().trim().optional(),
    photoStatus: z.enum(["submitted", "not_submitted"]),
    photo: z.instanceof(File).optional(),
    reason: z.string().trim().optional(),
  })
  .superRefine((data, context) => {
    if (data.photoStatus === "submitted" && !data.photo) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["photo"], message: "Choose an image to upload" });
    }
    if (data.photoStatus === "not_submitted" && !data.reason) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["reason"], message: "Tell us why the photo was not submitted" });
    }
  });

export type ExamFormValues = z.infer<typeof examSchema>;
export type SubmissionFormValues = z.infer<typeof submissionSchema>;

export const phoneSessionSchema = z.object({
  title: z.string().trim().min(1, "Enter a session title"),
  classGroup: z.string().trim().min(1, "Select a squad"),
  classroom: z.string().trim().optional(),
  studentIds: z.array(z.string().uuid()).optional(),
});

export const phoneStatusSchema = z.object({
  status: z.enum(["submitted", "taken_back", "not_submitted"]),
  reason: z.string().trim().optional(),
  requestId: z.string().uuid().optional(),
}).superRefine((value, context) => {
  if ((value.status === "taken_back" || value.status === "not_submitted") && !value.reason) context.addIssue({ code: z.ZodIssueCode.custom, path: ["reason"], message: "A reason is required for this status." });
});