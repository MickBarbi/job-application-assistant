/**
 * /api/resumes/generate
 *   POST — generate a tailored resume for an application (AI + LaTeX + PDF)
 */
import { createGenerateResumePostHandler } from "@/lib/services/resume-route-handler";

// Resume generation is a slow, server-only operation.
export const runtime = "nodejs";
export const maxDuration = 120;

export const POST = createGenerateResumePostHandler();
