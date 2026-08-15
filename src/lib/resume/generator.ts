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
  "1. NEVER invent, exaggerate, or alter facts. Employers, titles, dates,",
  "   degrees, companies, project names, and tech stacks must match the master",
  "   exactly. Copy every number, GPA, and metric VERBATIM — never change a digit",
  "   (a 3.8 GPA stays 3.8, not 7.8).",
  "2. Use only skills, tools, and accomplishments present in the master. Never add",
  "   a skill to a category where it is not listed, and never claim personal",
  "   ownership of work the master does not attribute to the candidate.",
  "3. You SHOULD reorder and select for relevance: put the experience, projects,",
  "   and skills most relevant to THIS job first, and drop projects unrelated to",
  "   it. Keep the strongest, most on-target items.",
  "4. Preserve each kept item's concrete details — specific tools, actions, and",
  "   numbers. Do not make a specific bullet vaguer, and do not merge two",
  "   distinct accomplishments into one bullet.",
  "5. Keep verb tense accurate: current roles use present tense; past roles and",
  "   finished activities use past tense.",
  "6. Keep the same JSON shape as the input (contact, summary, skills, experience,",
  "   education, projects, leadership), preserving every field of the items you",
  '   keep, and add only a top-level "rationale" string explaining your choices.',
  "7. Respond with a single, raw JSON object and nothing else — no markdown code",
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
