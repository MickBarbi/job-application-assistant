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

/**
 * Raised when the OpenAI API rejects or fails a request (bad key, rate limit,
 * upstream outage). Carries a user-facing message so the route layer can return
 * a clear status instead of a generic 500.
 */
export class OpenAIRequestError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = "OpenAIRequestError";
  }
}

/** Turns an OpenAI SDK error into a concise, user-facing message. */
function describeOpenAIError(err: InstanceType<typeof OpenAI.APIError>): string {
  switch (err.status) {
    case 401:
      return "OpenAI rejected the API key. Check OPENAI_API_KEY in your environment.";
    case 429:
      return "OpenAI rate limit or quota reached. Wait a moment and try again.";
    case 500:
    case 502:
    case 503:
      return "OpenAI is temporarily unavailable. Please try again shortly.";
    default:
      return `OpenAI request failed${err.status ? ` (status ${err.status})` : ""}.`;
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
    let response;
    try {
      response = await this.client.chat.completions.create({
        model: this.model,
        temperature: req.temperature ?? 0.4,
        response_format: req.json ? { type: "json_object" } : undefined,
        messages: [
          { role: "system", content: req.system },
          { role: "user", content: req.user },
        ],
      });
    } catch (err) {
      if (err instanceof OpenAI.APIError) {
        throw new OpenAIRequestError(describeOpenAIError(err), err.status);
      }
      throw err;
    }

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
