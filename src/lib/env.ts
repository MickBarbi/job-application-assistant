/**
 * Centralised, validated access to environment variables. Importing from here
 * (rather than reading process.env directly) keeps configuration in one place
 * and surfaces misconfiguration early.
 */

export type LatexEngine = "tectonic" | "pdflatex" | "xelatex";

const VALID_ENGINES: LatexEngine[] = ["tectonic", "pdflatex", "xelatex"];

function parseEngine(value: string | undefined): LatexEngine {
  if (value && (VALID_ENGINES as string[]).includes(value)) {
    return value as LatexEngine;
  }
  return "tectonic";
}

export const env = {
  databaseUrl: process.env.DATABASE_URL ?? "file:./dev.db",
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiModel: process.env.OPENAI_MODEL ?? "gpt-4o",
  openaiBaseUrl: process.env.OPENAI_BASE_URL || undefined,
  latexEngine: parseEngine(process.env.LATEX_ENGINE),
  storageDir: process.env.STORAGE_DIR ?? "./storage",
};

/** Whether AI features are configured. */
export function hasOpenAI(): boolean {
  return env.openaiApiKey.length > 0;
}
