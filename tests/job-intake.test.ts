import { describe, expect, it } from "vitest";
import { mergeJobPostingDraft, parseJobPostingDraft } from "@/lib/jobs/intake";
import type { JobPostingInput } from "@/lib/validation";

describe("parseJobPostingDraft", () => {
  it("extracts labeled fields, source, salary, and the full description", () => {
    const draft = parseJobPostingDraft(`
      Job Title: Senior Frontend Engineer
      Company: Aurora Labs
      Location: Remote - US
      Compensation: $150k - $180k / year
      Link: https://www.linkedin.com/jobs/view/12345

      Responsibilities
      Build React and TypeScript interfaces for job seekers.
    `);

    expect(draft).toMatchObject({
      title: "Senior Frontend Engineer",
      company: "Aurora Labs",
      location: "Remote - US",
      salaryRange: "$150k - $180k / year",
      url: "https://www.linkedin.com/jobs/view/12345",
      source: "LinkedIn",
    });
    expect(draft.description).toContain("Build React and TypeScript interfaces");
  });

  it("infers a title and company from common copied posting layouts", () => {
    const draft = parseJobPostingDraft(`
      Staff Product Engineer
      Example Health
      New York, NY Hybrid

      About the role
      We are looking for a product-minded engineer.
    `);

    expect(draft.title).toBe("Staff Product Engineer");
    expect(draft.company).toBe("Example Health");
    expect(draft.location).toBe("New York, NY Hybrid");
  });
});

describe("mergeJobPostingDraft", () => {
  it("preserves user notes and only uses populated draft values", () => {
    const current: JobPostingInput = {
      title: "Existing title",
      company: "",
      location: "",
      url: "",
      source: "Referral",
      description: "",
      salaryRange: "",
      notes: "Ask Sam for referral.",
    };

    expect(mergeJobPostingDraft(current, {
      title: "Parsed title",
      company: "Parsed Co",
      source: "Pasted posting",
      description: "Full posting",
    })).toEqual({
      title: "Parsed title",
      company: "Parsed Co",
      location: "",
      url: "",
      source: "Pasted posting",
      description: "Full posting",
      salaryRange: "",
      notes: "Ask Sam for referral.",
    });
  });
});
