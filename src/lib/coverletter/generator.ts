/**
 * Cover-letter tailoring orchestration.
 *
 * Given a master resume, a job posting, and a completer (OpenAI or a test
 * fake), produces a tailored cover letter: structured pieces (greeting, body
 * paragraphs, closing) plus the assembled plain-text letter. Like the resume
 * generator, the AI is constrained to draw only on facts already present in the
 * master resume — it must never invent employers, achievements, or credentials.
 *
 * The prompt builders and assembler are pure and exported so they can be
 * unit-tested without any network calls.
 */
import {
  masterResumeDataSchema,
  coverLetterDataSchema,
  type MasterResumeData,
  type CoverLetterData,
} from "@/lib/validation";
import { COVER_LETTER_TONE_LABELS, type CoverLetterTone } from "@/lib/types";
import type { ChatCompleter } from "@/lib/openai";
import { completeJson } from "@/lib/json-completion";

export interface CoverLetterJobContext {
  title: string;
  company: string;
  location?: string;
  description?: string;
}

export interface GenerateCoverLetterParams {
  master: MasterResumeData;
  job: CoverLetterJobContext;
  tone: CoverLetterTone;
}

export interface GenerateCoverLetterResult {
  data: CoverLetterData;
  /** The assembled, ready-to-send plain-text letter. */
  body: string;
  model: string;
}

/** Short, prompt-facing guidance for each supported tone. */
const TONE_GUIDANCE: Record<CoverLetterTone, string> = {
  professional:
    "Polished and businesslike: confident, respectful, and free of filler.",
  enthusiastic:
    "Warm and energetic: convey genuine excitement for the role without hyperbole.",
  concise:
    "Tight and to the point: three short paragraphs at most, no wasted words.",
};

export const SYSTEM_PROMPT = [
  "You are an expert career coach who writes tailored cover letters.",
  "You write a cover letter for a specific job using ONLY the facts contained",
  "in the candidate's master resume.",
  "",
  "Hard rules — follow them exactly:",
  "1. NEVER invent, exaggerate, or alter facts: employers, job titles, dates,",
  "   metrics, degrees, or skills must be supported by the master resume.",
  "2. Write in the first person as the candidate. Do not use placeholders like",
  '   "[Company]" — use the real details you are given.',
  "3. Connect the candidate's actual experience to the target role; be specific",
  "   and avoid generic filler that could apply to any job.",
  "4. Respond with a single JSON object and nothing else, matching this shape:",
  '   { "greeting": string, "paragraphs": string[], "closing": string,',
  '     "rationale": string }.',
  "   `paragraphs` holds the body paragraphs in order (no greeting or signature).",
  "   `closing` is a sign-off phrase only (e.g. \"Sincerely,\"). `rationale`",
  "   briefly explains the tailoring choices.",
  "5. Respond with a single, raw JSON object and nothing else — no markdown code",
  "   fences, no commentary before or after the JSON.",
].join("\n");

/** Builds the user prompt. Pure — safe to unit test. */
export function buildCoverLetterPrompt(
  params: GenerateCoverLetterParams
): string {
  const { master, job, tone } = params;
  return [
    "## Target job posting",
    `Title: ${job.title}`,
    `Company: ${job.company}`,
    job.location ? `Location: ${job.location}` : "",
    "",
    "Description:",
    job.description?.trim() || "(no description provided)",
    "",
    `## Desired tone: ${COVER_LETTER_TONE_LABELS[tone]}`,
    TONE_GUIDANCE[tone],
    "",
    "## Candidate master resume (JSON — the only source of truth for facts)",
    "```json",
    JSON.stringify(master, null, 2),
    "```",
    "",
    "## Task",
    "Write a tailored cover letter as a JSON object with `greeting`,",
    "`paragraphs` (an ordered array of body paragraphs), `closing`, and",
    "`rationale`. Do not add commentary outside the JSON.",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

/**
 * Parses and validates the model's JSON response into CoverLetterData.
 * Tolerates the model wrapping JSON in ```json fences.
 * @throws if the response is not valid JSON or fails schema validation.
 */
export function parseCoverLetterResponse(raw: string): CoverLetterData {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("Model did not return valid JSON.");
  }
  return coverLetterDataSchema.parse(parsed);
}

/**
 * Assembles the structured pieces into a ready-to-send letter. Pure and
 * deterministic: greeting, a blank line, body paragraphs separated by blank
 * lines, then the closing and the candidate's name.
 */
export function assembleCoverLetter(
  data: CoverLetterData,
  signerName: string
): string {
  const blocks = [
    data.greeting.trim(),
    ...data.paragraphs.map((p) => p.trim()),
    [data.closing.trim(), signerName.trim()].filter(Boolean).join("\n"),
  ];
  return blocks.filter(Boolean).join("\n\n");
}

/**
 * Runs the full cover-letter pipeline: validates the master resume, prompts the
 * completer, parses/validates the response, and assembles the letter text.
 */
export async function generateCoverLetter(
  params: GenerateCoverLetterParams,
  completer: ChatCompleter
): Promise<GenerateCoverLetterResult> {
  // Defensive: ensure the master conforms before spending a token.
  const master = masterResumeDataSchema.parse(params.master);

  const data = await completeJson(
    completer,
    {
      system: SYSTEM_PROMPT,
      user: buildCoverLetterPrompt({ ...params, master }),
      json: true,
    },
    parseCoverLetterResponse
  );

  const body = assembleCoverLetter(data, master.contact.name);

  return { data, body, model: completer.model };
}
