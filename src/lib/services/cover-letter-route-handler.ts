/**
 * Factory for the cover-letter-generation route handler.
 *
 * Keeping the factory outside App Router route files lets tests inject a fake
 * OpenAI boundary while the App Router file exports only valid route fields for
 * Next.js.
 */
import { created, parseJson, handle } from "@/lib/api";
import { generateCoverLetterInputSchema } from "@/lib/validation";
import {
  generateCoverLetterForApplication,
  type CoverLetterGenerationDependencies,
} from "@/lib/services/cover-letter-service";

type PostHandler = (request: Request) => Promise<Response>;

export function createGenerateCoverLetterPostHandler(
  dependencies?: CoverLetterGenerationDependencies
): PostHandler {
  return (request: Request) =>
    handle(async () => {
      const input = await parseJson(request, generateCoverLetterInputSchema);
      const outcome = await generateCoverLetterForApplication(
        input,
        dependencies
      );
      return created(outcome);
    });
}
