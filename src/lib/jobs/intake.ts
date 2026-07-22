/**
 * Heuristics for turning pasted job-posting text into an add-job form draft.
 * The parser is intentionally local/deterministic so intake works without API
 * keys, network calls, or trusting AI with unvalidated writes.
 */
import type { JobPostingInput } from "@/lib/validation";

type JobPostingDraft = Partial<JobPostingInput>;

const URL_PATTERN = /https?:\/\/[^\s)\]}>,"']+/i;
const SALARY_PATTERN = /(?:\$\s?\d[\d,.]*\s?(?:k|K)?(?:\s?[-–—]\s?\$?\s?\d[\d,.]*\s?(?:k|K)?)?)(?:\s?(?:\/|per)\s?(?:year|yr|hour|hr))?/;

const FIELD_LABELS: Record<string, keyof JobPostingInput> = {
  title: "title",
  "job title": "title",
  role: "title",
  position: "title",
  company: "company",
  employer: "company",
  organization: "company",
  location: "location",
  workplace: "location",
  salary: "salaryRange",
  compensation: "salaryRange",
  pay: "salaryRange",
  url: "url",
  link: "url",
  source: "source",
};

const SECTION_HEADING_PATTERN = /^(about|benefits|compensation|description|job description|qualifications|requirements|responsibilities|what you(?:'|’)ll do|who you are)\b/i;

export function parseJobPostingDraft(rawText: string): JobPostingDraft {
  const text = normalizeWhitespace(rawText);
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const draft: JobPostingDraft = {};
  const labeled = parseLabeledFields(lines);
  Object.assign(draft, labeled);

  const url = draft.url ?? findUrl(text);
  if (url) draft.url = url;

  const salaryRange = draft.salaryRange ?? findSalary(text);
  if (salaryRange) draft.salaryRange = salaryRange;

  if (!draft.title) {
    const title = inferTitle(lines);
    if (title) draft.title = title;
  }

  if (!draft.company) {
    const company = inferCompany(lines, draft.title);
    if (company) draft.company = company;
  }

  if (!draft.location) {
    const location = inferLocation(lines);
    if (location) draft.location = location;
  }

  if (!draft.source) {
    draft.source = inferSource(draft.url) ?? "Pasted posting";
  }

  if (text) {
    draft.description = text;
  }

  return draft;
}

export function mergeJobPostingDraft(
  current: JobPostingInput,
  draft: JobPostingDraft
): JobPostingInput {
  return {
    ...current,
    title: draft.title || current.title,
    company: draft.company || current.company,
    location: draft.location || current.location,
    url: draft.url || current.url,
    source: draft.source || current.source,
    salaryRange: draft.salaryRange || current.salaryRange,
    description: draft.description || current.description,
    notes: current.notes,
  };
}

function normalizeWhitespace(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[\t ]+/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseLabeledFields(lines: string[]): JobPostingDraft {
  const draft: JobPostingDraft = {};

  for (const line of lines) {
    const match = /^(?<label>[A-Za-z][A-Za-z /_-]{1,30})\s*:\s*(?<value>.+)$/.exec(line);
    const label = match?.groups?.label?.toLowerCase().trim();
    const value = match?.groups?.value?.trim();
    if (!label || !value) continue;

    const field = FIELD_LABELS[label];
    if (!field || draft[field]) continue;

    if (field === "url") {
      const url = findUrl(value);
      if (url) draft.url = url;
      continue;
    }

    draft[field] = cleanFieldValue(value);
  }

  return draft;
}

function findUrl(text: string): string | undefined {
  return URL_PATTERN.exec(text)?.[0]?.replace(/[.,;:]+$/, "");
}

function findSalary(text: string): string | undefined {
  return SALARY_PATTERN.exec(text)?.[0]?.trim();
}

function inferTitle(lines: string[]): string | undefined {
  return lines.find((line) => isLikelyTitleLine(line));
}

function inferCompany(lines: string[], title: string | undefined): string | undefined {
  const titleIndex = title ? lines.findIndex((line) => line === title) : -1;
  const candidates = titleIndex >= 0 ? lines.slice(titleIndex + 1, titleIndex + 4) : lines.slice(0, 4);

  return candidates.find((line) => {
    if (!isShortPlainLine(line)) return false;
    if (line === title) return false;
    if (looksLikeLocation(line)) return false;
    return !SECTION_HEADING_PATTERN.test(line);
  });
}

function inferLocation(lines: string[]): string | undefined {
  const remoteLine = lines.find((line) => /\b(remote|hybrid|on-site|onsite)\b/i.test(line));
  if (remoteLine && remoteLine.length <= 80) return cleanFieldValue(remoteLine);

  return lines.find((line) => looksLikeLocation(line));
}

function inferSource(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    if (hostname.includes("linkedin")) return "LinkedIn";
    if (hostname.includes("greenhouse")) return "Greenhouse";
    if (hostname.includes("lever")) return "Lever";
    if (hostname.includes("indeed")) return "Indeed";
    return hostname;
  } catch {
    return undefined;
  }
}

function isLikelyTitleLine(line: string): boolean {
  if (!isShortPlainLine(line)) return false;
  if (SECTION_HEADING_PATTERN.test(line)) return false;
  if (looksLikeLocation(line)) return false;
  return /\b(engineer|developer|designer|manager|analyst|scientist|architect|lead|director|specialist|consultant|administrator|coordinator|product|program|data|software|frontend|backend|full[- ]stack)\b/i.test(line);
}

function isShortPlainLine(line: string): boolean {
  if (line.length < 3 || line.length > 90) return false;
  if (URL_PATTERN.test(line)) return false;
  if (/[.!?]$/.test(line)) return false;
  return true;
}

function looksLikeLocation(line: string): boolean {
  return /\b(remote|hybrid|on-site|onsite|united states|usa|canada|[A-Z][a-z]+,\s?[A-Z]{2})\b/.test(line);
}

function cleanFieldValue(value: string): string {
  return value.replace(/^[-•]\s*/, "").trim();
}
