/**
 * Thin, testable wrapper around the OpenAI SDK.
 *
 * The rest of the app depends on the `ChatCompleter` interface rather than the
 * SDK directly, which makes the resume generator trivial to unit test with a
 * fake completer (no network, no key required).
 */
import OpenAI from "openai";
import { env, hasOpenAI } from "./env";

export interface CompletionRequest {
  system: string;
  user: string;
  /** Force a JSON object response. */
  json?: boolean;
  temperature?: number;
}

export interface ChatCompleter {
  complete(req: CompletionRequest): Promise<string>;
  readonly model: string;
}

/** Raised when AI features are used without configuration. */
export class OpenAINotConfiguredError extends Error {
  constructor() {
    super(
      "OPENAI_API_KEY is not set. Add it to your environment to enable AI resume tailoring."
    );
    this.name = "OpenAINotConfiguredError";
  }
}

class OpenAICompleter implements ChatCompleter {
  private client: OpenAI;
  readonly model: string;

  constructor() {
    this.client = new OpenAI({
      apiKey: env.openaiApiKey,
      baseURL: env.openaiBaseUrl,
    });
    this.model = env.openaiModel;
  }

  async complete(req: CompletionRequest): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      temperature: req.temperature ?? 0.4,
      response_format: req.json ? { type: "json_object" } : undefined,
      messages: [
        { role: "system", content: req.system },
        { role: "user", content: req.user },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI returned an empty completion.");
    }
    return content;
  }
}

let cached: ChatCompleter | undefined;

/**
 * Returns the configured OpenAI completer. Throws OpenAINotConfiguredError if
 * no API key is present.
 */
export function getCompleter(): ChatCompleter {
  if (!hasOpenAI()) {
    throw new OpenAINotConfiguredError();
  }
  cached ??= new OpenAICompleter();
  return cached;
}
