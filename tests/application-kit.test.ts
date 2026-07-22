import { describe, expect, it } from "vitest";
import { buildApplicationChecklist, buildCopySnippets } from "@/lib/jobs/application-kit";
import type { ApplicationKitInput } from "@/lib/jobs/application-kit";

const baseInput: ApplicationKitInput = {
  title: "Senior Frontend Engineer",
  company: "Aurora Labs",
  location: "Remote - US",
  url: "https://example.com/jobs/123",
  status: "saved",
  hasGeneratedResume: false,
};

describe("buildApplicationChecklist", () => {
  it("marks saved postings, captured links, and resume/application progress", () => {
    expect(buildApplicationChecklist(baseInput)).toEqual([
      { label: "Posting saved in tracker", done: true },
      { label: "Posting link captured", done: true },
      { label: "Tailored resume generated", done: false },
      { label: "Application submitted", done: false },
      { label: "Follow-up notes saved", done: false },
    ]);

    expect(buildApplicationChecklist({
      ...baseInput,
      status: "interview",
      hasGeneratedResume: true,
    }).map((item) => item.done)).toEqual([true, true, true, true, true]);
  });
});

describe("buildCopySnippets", () => {
  it("builds recruiter, follow-up, and tracking snippets from job data", () => {
    const snippets = buildCopySnippets(baseInput);

    expect(snippets).toHaveLength(3);
    expect(snippets[0]?.text).toContain("Senior Frontend Engineer role at Aurora Labs");
    expect(snippets[0]?.text).toContain("https://example.com/jobs/123");
    expect(snippets[1]?.text).toContain("follow up on my application");
    expect(snippets[2]?.text).toContain("Status: Saved");
  });
});
