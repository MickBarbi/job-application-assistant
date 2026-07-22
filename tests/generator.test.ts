import { describe, it, expect, vi } from "vitest";
import {
  buildUserPrompt,
  parseTailoredResponse,
  generateTailoredResume,
  SYSTEM_PROMPT,
} from "@/lib/resume/generator";
import type { ChatCompleter, CompletionRequest } from "@/lib/openai";
import { SAMPLE_MASTER_RESUME, DEFAULT_TEMPLATE_BODY } from "@/lib/resume/defaults";

/** A deterministic fake completer for tests — no network, no API key. */
function fakeCompleter(response: string): ChatCompleter {
  return {
    model: "fake-model",
    complete: vi.fn(async (_req: CompletionRequest) => response),
  };
}

const validTailored = JSON.stringify({
  contact: { name: "Alex Rivera", email: "alex@example.com" },
  summary: "Tailored summary",
  skills: ["React", "TypeScript"],
  experience: [
    {
      company: "Northwind Labs",
      title: "Senior Software Engineer",
      highlights: ["Led a migration"],
    },
  ],
  education: [],
  projects: [],
  rationale: "Emphasised React experience for the frontend role.",
});

describe("buildUserPrompt", () => {
  it("includes job details and the master resume JSON", () => {
    const prompt = buildUserPrompt({
      master: SAMPLE_MASTER_RESUME,
      job: { title: "Frontend Engineer", company: "Aurora", description: "React" },
      templateBody: DEFAULT_TEMPLATE_BODY,
    });
    expect(prompt).toContain("Frontend Engineer");
    expect(prompt).toContain("Aurora");
    expect(prompt).toContain("Alex Rivera");
  });

  it("handles a missing description gracefully", () => {
    const prompt = buildUserPrompt({
      master: SAMPLE_MASTER_RESUME,
      job: { title: "T", company: "C" },
      templateBody: "",
    });
    expect(prompt).toContain("(no description provided)");
  });
});

describe("parseTailoredResponse", () => {
  it("parses clean JSON", () => {
    const parsed = parseTailoredResponse(validTailored);
    expect(parsed.contact.name).toBe("Alex Rivera");
    expect(parsed.rationale).toContain("React");
  });

  it("tolerates ```json fences", () => {
    const parsed = parseTailoredResponse("```json\n" + validTailored + "\n```");
    expect(parsed.skills).toEqual(["React", "TypeScript"]);
  });

  it("throws on non-JSON", () => {
    expect(() => parseTailoredResponse("not json")).toThrow(/valid JSON/);
  });

  it("throws when the schema is violated", () => {
    expect(() =>
      parseTailoredResponse(JSON.stringify({ contact: { email: "x@y.com" } }))
    ).toThrow();
  });
});

describe("generateTailoredResume", () => {
  it("runs the pipeline and renders LaTeX", async () => {
    const completer = fakeCompleter(validTailored);
    const result = await generateTailoredResume(
      {
        master: SAMPLE_MASTER_RESUME,
        job: { title: "Frontend Engineer", company: "Aurora" },
        templateBody: DEFAULT_TEMPLATE_BODY,
      },
      completer
    );

    expect(result.model).toBe("fake-model");
    expect(result.tailored.summary).toBe("Tailored summary");
    expect(result.latex).toContain("Alex Rivera");
    expect(result.latex).toContain("\\documentclass");
    expect(completer.complete).toHaveBeenCalledOnce();
  });

  it("passes the system prompt and requests JSON", async () => {
    const completer = fakeCompleter(validTailored);
    await generateTailoredResume(
      {
        master: SAMPLE_MASTER_RESUME,
        job: { title: "T", company: "C" },
        templateBody: DEFAULT_TEMPLATE_BODY,
      },
      completer
    );
    const call = (completer.complete as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.system).toBe(SYSTEM_PROMPT);
    expect(call.json).toBe(true);
  });

  it("rejects an invalid master resume before calling the model", async () => {
    const completer = fakeCompleter(validTailored);
    await expect(
      generateTailoredResume(
        {
          // @ts-expect-error intentionally invalid
          master: { contact: { email: "no-name@x.com" } },
          job: { title: "T", company: "C" },
          templateBody: "",
        },
        completer
      )
    ).rejects.toThrow();
    expect(completer.complete).not.toHaveBeenCalled();
  });
});
