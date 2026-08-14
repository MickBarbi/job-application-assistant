/**
 * /api/cover-letters/generate
 *   POST — generate a tailored cover letter for an application (AI, no PDF)
 */
import { createGenerateCoverLetterPostHandler } from "@/lib/services/cover-letter-route-handler";

// Cover-letter generation is a slow, server-only operation.
export const runtime = "nodejs";
export const maxDuration = 120;

export const POST = createGenerateCoverLetterPostHandler();
