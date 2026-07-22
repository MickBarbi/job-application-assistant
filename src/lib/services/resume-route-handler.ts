/**
 * Factory for the resume-generation route handler.
 *
 * Keeping the factory outside App Router route files lets tests inject fake
 * OpenAI/PDF boundaries while the App Router file exports only valid route
 * fields for Next.js.
 */
import { created, parseJson, handle } from "@/lib/api";
import { generateResumeInputSchema } from "@/lib/validation";
import {
  generateResumeForApplication,
  type ResumeGenerationDependencies,
} from "@/lib/services/resume-service";

type PostHandler = (request: Request) => Promise<Response>;

export function createGenerateResumePostHandler(
  dependencies?: ResumeGenerationDependencies
): PostHandler {
  return (request: Request) =>
    handle(async () => {
      const input = await parseJson(request, generateResumeInputSchema);
      const outcome = await generateResumeForApplication(input, dependencies);
      return created(outcome);
    });
}
