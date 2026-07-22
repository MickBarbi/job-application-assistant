import { describe, it, expect } from "vitest";
import {
  masterResumeDataSchema,
  jobPostingInputSchema,
  applicationUpdateSchema,
  tailoredResumeDataSchema,
} from "@/lib/validation";

describe("masterResumeDataSchema", () => {
  it("applies defaults for optional fields", () => {
    const parsed = masterResumeDataSchema.parse({
      contact: { name: "A", email: "a@b.com" },
    });
    expect(parsed.skills).toEqual([]);
    expect(parsed.experience).toEqual([]);
    expect(parsed.contact.phone).toBe("");
  });

  it("rejects a missing name", () => {
    const result = masterResumeDataSchema.safeParse({
      contact: { email: "a@b.com" },
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty email (not yet provided)", () => {
    const result = masterResumeDataSchema.safeParse({
      contact: { name: "A", email: "" },
    });
    expect(result.success).toBe(true);
  });
});

describe("jobPostingInputSchema", () => {
  it("requires title and company", () => {
    expect(jobPostingInputSchema.safeParse({ title: "", company: "X" }).success).toBe(
      false
    );
    expect(
      jobPostingInputSchema.safeParse({ title: "Eng", company: "X" }).success
    ).toBe(true);
  });

  it("accepts empty url but rejects malformed url", () => {
    expect(
      jobPostingInputSchema.safeParse({ title: "E", company: "C", url: "" })
        .success
    ).toBe(true);
    expect(
      jobPostingInputSchema.safeParse({
        title: "E",
        company: "C",
        url: "not-a-url",
      }).success
    ).toBe(false);
  });
});

describe("applicationUpdateSchema", () => {
  it("accepts a valid status", () => {
    expect(applicationUpdateSchema.safeParse({ status: "interview" }).success).toBe(
      true
    );
  });

  it("rejects an unknown status", () => {
    expect(applicationUpdateSchema.safeParse({ status: "ghosted" }).success).toBe(
      false
    );
  });
});

describe("tailoredResumeDataSchema", () => {
  it("defaults rationale to empty string", () => {
    const parsed = tailoredResumeDataSchema.parse({
      contact: { name: "A", email: "" },
    });
    expect(parsed.rationale).toBe("");
  });
});
