/**
 * Robust JSON completion helper shared by the resume and cover-letter
 * generators.
 *
 * Cloud models (OpenAI, Claude) almost always return well-formed JSON, but
 * smaller/local models — e.g. anything served through an OpenAI-compatible
 * endpoint like Ollama — occasionally emit malformed JSON or wrap it in prose.
 * This helper retries once (by default) with a corrective instruction appended
 * to the prompt, which dramatically improves reliability without changing the
 * happy path for strong models.
 */
import type { ChatCompleter, CompletionRequest } from "@/lib/openai";

export interface CompleteJsonOptions {
  /** Maximum total attempts, including the first. Defaults to 2. */
  maxAttempts?: number;
}

/**
 * Calls the completer and parses the response with `parse`. If `parse` throws
 * (invalid JSON or schema violation), retries with a correction hint appended
 * to the user prompt until `maxAttempts` is reached, then rethrows the last
 * error.
 *
 * Only parse failures are retried — errors thrown by the completer itself
 * (misconfiguration, upstream API failure) propagate immediately.
 */
export async function completeJson<T>(
  completer: ChatCompleter,
  request: CompletionRequest,
  parse: (raw: string) => T,
  options: CompleteJsonOptions = {}
): Promise<T> {
  const maxAttempts = Math.max(1, options.maxAttempts ?? 2);
  let user = request.user;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const raw = await completer.complete({ ...request, user });
    try {
      return parse(raw);
    } catch (err) {
      lastError = err;
      user = buildCorrectionPrompt(request.user, err);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Model did not return a parseable JSON object.");
}

/** Appends a correction note so the next attempt fixes its output. */
function buildCorrectionPrompt(originalUser: string, err: unknown): string {
  return [
    originalUser,
    "",
    "## Correction",
    "Your previous response could not be parsed as the required JSON object.",
    err instanceof Error ? `Parser error: ${err.message}` : "",
    "Respond again with a SINGLE, raw JSON object and nothing else — no markdown",
    "code fences, no commentary before or after, matching the requested fields",
    "exactly.",
  ]
    .filter((line) => line !== "")
    .join("\n");
}
