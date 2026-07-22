/**
 * /api/resumes/generate
 *   POST — generate a tailored resume for an application (AI + LaTeX + PDF)
 */
import { created, parseJson, handle } from "@/lib/api";
import { generateResumeInputSchema } from "@/lib/validation";
import { generateResumeForApplication } from "@/lib/services/resume-service";

// Resume generation is a slow, server-only operation.
export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  return handle(async () => {
    const input = await parseJson(request, generateResumeInputSchema);
    const outcome = await generateResumeForApplication(input);
    return created(outcome);
  });
}
