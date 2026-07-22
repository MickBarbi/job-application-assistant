/**
 * /api/templates
 *   GET  — list LaTeX templates
 *   POST — create a template (optionally marking it default)
 */
import { prisma } from "@/lib/db";
import { ok, created, parseJson, handle } from "@/lib/api";
import { latexTemplateInputSchema } from "@/lib/validation";

export async function GET() {
  return handle(async () => {
    const templates = await prisma.latexTemplate.findMany({
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });
    return ok(templates);
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    const input = await parseJson(request, latexTemplateInputSchema);
    // Ensure at most one default.
    const template = await prisma.$transaction(async (tx) => {
      if (input.isDefault) {
        await tx.latexTemplate.updateMany({ data: { isDefault: false } });
      }
      const count = await tx.latexTemplate.count();
      return tx.latexTemplate.create({
        // First template becomes default automatically.
        data: { ...input, isDefault: input.isDefault || count === 0 },
      });
    });
    return created(template);
  });
}
