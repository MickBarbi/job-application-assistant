/**
 * Small helpers for building consistent JSON API responses and handling errors
 * uniformly across route handlers.
 */
import { NextResponse } from "next/server";
import { ZodError, type ZodTypeAny, type z } from "zod";

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, init);
}

export function created<T>(data: T): NextResponse {
  return NextResponse.json(data, { status: 201 });
}

export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

export interface ApiErrorBody {
  error: string;
  details?: unknown;
}

export function error(
  message: string,
  status = 400,
  details?: unknown
): NextResponse {
  const body: ApiErrorBody = { error: message };
  if (details !== undefined) body.details = details;
  return NextResponse.json(body, { status });
}

/** Thrown by services to signal a specific HTTP status. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/**
 * Parses and validates a request body against a Zod schema.
 * @throws HttpError(400) with field details when validation fails.
 */
export async function parseJson<S extends ZodTypeAny>(
  request: Request,
  schema: S
): Promise<z.output<S>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new HttpError(400, "Request body must be valid JSON.");
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new HttpError(400, "Validation failed.", result.error.flatten());
  }
  return result.data;
}

/**
 * Wraps a route handler so thrown errors become clean JSON responses instead of
 * unhandled 500s. Known error types map to appropriate statuses.
 */
export function handle(
  fn: () => Promise<Response>
): Promise<Response> {
  return fn().catch((err: unknown) => {
    if (err instanceof HttpError) {
      return error(err.message, err.status, err.details);
    }
    if (err instanceof ZodError) {
      return error("Validation failed.", 400, err.flatten());
    }
    // OpenAI/LaTeX misconfiguration surfaces as a 503 with the message.
    const name = err instanceof Error ? err.name : "";
    if (name === "OpenAINotConfiguredError" || name === "PdfCompilationError") {
      return error(
        err instanceof Error ? err.message : "Service unavailable.",
        503
      );
    }
    console.error("Unhandled API error:", err);
    return error("Internal server error.", 500);
  });
}
