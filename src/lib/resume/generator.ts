/**
 * Resume tailoring orchestration.
 *
 * Given a master resume, a job posting, and a completer (OpenAI or a test
 * fake), produces a tailored resume: structured data plus a rendered LaTeX
 * document. The AI is constrained to rephrase, reorder, and select content from
 * the master resume — it must never invent employers, titles, dates, or
 * credentials.
 *
 * The prompt builders are pure and exported so they can be unit-tested without
 * any network calls.
 */
import {
  masterResumeDataSchema,
  tailoredResumeDataSchema,
  type MasterResumeData,
  type TailoredResumeData,
} from "@/lib/validation";
import type { ChatCompleter } from "@/lib/openai";
import { completeJson } from "@/lib/json-completion";
import { renderResumeLatex } from "./latex";

export interface JobContext {
  title: string;
  company: string;
  location?: string;
  description?: string;
}

export interface GenerateParams {
  master: MasterResumeData;
  job: JobContext;
  templateBody: string;
}

export interface GenerateResult {
  tailored: TailoredResumeData;
  latex: string;
  model: string;
}

export const SYSTEM_PROMPT = [
  "You are an expert technical resume writer and career coach.",
  "You tailor an existing master resume to a specific job posting.",
  "",
  "Hard rules — follow them exactly:",
  "1. NEVER invent, exaggerate, or alter facts: employers, job titles,",
  "   employment dates, degrees, and companies must match the master resume.",
  "2. You MAY rephrase bullet points, reorder items by relevance to the job,",
  "   select the most relevant skills/projects, and tighten the summary.",
  "3. Prefer strong action verbs and quantified impact already present in the",
  "   master; do not fabricate metrics that are not there.",
  "4. Keep the same JSON shape as the input resume, adding only a top-level",
  '   "rationale" string that briefly explains your tailoring choices.',
  "5. Respond with a single, raw JSON object and nothing else — no markdown code",
  "   fences, no commentary before or after the JSON.",
].join("\n");

/** Builds the user prompt. Pure — safe to unit test. */
export function buildUserPrompt(params: GenerateParams): string {
  const { master, job } = params;
  return [
    "## Target job posting",
    `Title: ${job.title}`,
    `Company: ${job.company}`,
    job.location ? `Location: ${job.location}` : "",
    "",
    "Description:",
    job.description?.trim() || "(no description provided)",
    "",
    "## Master resume (JSON — the only source of truth for facts)",
    "```json",
    JSON.stringify(master, null, 2),
    "```",
    "",
    "## Task",
    "Return a tailored version of the resume as a JSON object with the same",
    'fields (contact, summary, skills, experience, education, projects) plus a',
    '"rationale" string. Do not add commentary outside the JSON.',
  ]
    .filter((line) => line !== "")
    .join("\n");
}

/**
 * Parses and validates the model's JSON response into TailoredResumeData.
 * Tolerates the model wrapping JSON in ```json fences.
 * @throws if the response is not valid JSON or fails schema validation.
 */
export function parseTailoredResponse(raw: string): TailoredResumeData {
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
  return tailoredResumeDataSchema.parse(parsed);
}

/**
 * Runs the full tailoring pipeline: validates the master resume, prompts the
 * completer, parses/validates the response, and renders LaTeX.
 */
export async function generateTailoredResume(
  params: GenerateParams,
  completer: ChatCompleter
): Promise<GenerateResult> {
  // Defensive: ensure the master conforms before spending a token.
  const master = masterResumeDataSchema.parse(params.master);

  const tailored = await completeJson(
    completer,
    {
      system: SYSTEM_PROMPT,
      user: buildUserPrompt({ ...params, master }),
      json: true,
    },
    parseTailoredResponse
  );

  const latex = renderResumeLatex(params.templateBody, tailored);

  return { tailored, latex, model: completer.model };
}
