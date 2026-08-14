import { describe, it, expect, vi } from "vitest";
import {
  buildCoverLetterPrompt,
  parseCoverLetterResponse,
  assembleCoverLetter,
  generateCoverLetter,
  SYSTEM_PROMPT,
} from "@/lib/coverletter/generator";
import type { ChatCompleter, CompletionRequest } from "@/lib/openai";
import { SAMPLE_MASTER_RESUME } from "@/lib/resume/defaults";

/** A deterministic fake completer for tests — no network, no API key. */
function fakeCompleter(response: string): ChatCompleter {
  return {
    model: "fake-model",
    complete: vi.fn(async (_req: CompletionRequest) => response),
  };
}

const validLetter = JSON.stringify({
  greeting: "Dear Aurora team,",
  paragraphs: [
    "I am excited to apply for the Frontend Engineer role.",
    "At Northwind Labs I led a migration that cut latency by 38%.",
  ],
  closing: "Sincerely,",
  rationale: "Highlighted React and performance work relevant to the role.",
});

describe("buildCoverLetterPrompt", () => {
  it("includes job details, tone guidance, and the master resume JSON", () => {
    const prompt = buildCoverLetterPrompt({
      master: SAMPLE_MASTER_RESUME,
      job: { title: "Frontend Engineer", company: "Aurora", description: "React" },
      tone: "enthusiastic",
    });
    expect(prompt).toContain("Frontend Engineer");
    expect(prompt).toContain("Aurora");
    expect(prompt).toContain("Enthusiastic");
    expect(prompt).toContain("Alex Rivera");
  });

  it("handles a missing description gracefully", () => {
    const prompt = buildCoverLetterPrompt({
      master: SAMPLE_MASTER_RESUME,
      job: { title: "T", company: "C" },
      tone: "professional",
    });
    expect(prompt).toContain("(no description provided)");
  });
});

describe("parseCoverLetterResponse", () => {
  it("parses clean JSON", () => {
    const parsed = parseCoverLetterResponse(validLetter);
    expect(parsed.paragraphs).toHaveLength(2);
    expect(parsed.greeting).toContain("Aurora");
  });

  it("tolerates ```json fences", () => {
    const parsed = parseCoverLetterResponse("```json\n" + validLetter + "\n```");
    expect(parsed.closing).toBe("Sincerely,");
  });

  it("throws on non-JSON", () => {
    expect(() => parseCoverLetterResponse("not json")).toThrow(/valid JSON/);
  });

  it("throws when there are no paragraphs", () => {
    expect(() =>
      parseCoverLetterResponse(JSON.stringify({ paragraphs: [] }))
    ).toThrow();
  });
});

describe("assembleCoverLetter", () => {
  it("joins greeting, paragraphs, closing, and signer with blank lines", () => {
    const data = parseCoverLetterResponse(validLetter);
    const text = assembleCoverLetter(data, "Alex Rivera");
    expect(text).toBe(
      [
        "Dear Aurora team,",
        "I am excited to apply for the Frontend Engineer role.",
        "At Northwind Labs I led a migration that cut latency by 38%.",
        "Sincerely,\nAlex Rivera",
      ].join("\n\n")
    );
  });

  it("omits an empty signer without leaving a dangling blank line", () => {
    const data = parseCoverLetterResponse(validLetter);
    const text = assembleCoverLetter(data, "");
    expect(text.endsWith("Sincerely,")).toBe(true);
  });
});

describe("generateCoverLetter", () => {
  it("runs the pipeline and assembles the letter", async () => {
    const completer = fakeCompleter(validLetter);
    const result = await generateCoverLetter(
      {
        master: SAMPLE_MASTER_RESUME,
        job: { title: "Frontend Engineer", company: "Aurora" },
        tone: "professional",
      },
      completer
    );

    expect(result.model).toBe("fake-model");
    expect(result.data.paragraphs).toHaveLength(2);
    expect(result.body).toContain("Dear Aurora team,");
    expect(result.body).toContain("Alex Rivera");
    expect(completer.complete).toHaveBeenCalledOnce();
  });

  it("passes the system prompt and requests JSON", async () => {
    const completer = fakeCompleter(validLetter);
    await generateCoverLetter(
      {
        master: SAMPLE_MASTER_RESUME,
        job: { title: "T", company: "C" },
        tone: "concise",
      },
      completer
    );
    const call = (completer.complete as ReturnType<typeof vi.fn>).mock
      .calls[0]![0];
    expect(call.system).toBe(SYSTEM_PROMPT);
    expect(call.json).toBe(true);
  });

  it("rejects an invalid master resume before calling the model", async () => {
    const completer = fakeCompleter(validLetter);
    await expect(
      generateCoverLetter(
        {
          // @ts-expect-error intentionally invalid
          master: { contact: { email: "no-name@x.com" } },
          job: { title: "T", company: "C" },
          tone: "professional",
        },
        completer
      )
    ).rejects.toThrow();
    expect(completer.complete).not.toHaveBeenCalled();
  });
});
