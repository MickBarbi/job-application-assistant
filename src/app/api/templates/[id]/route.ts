/**
 * /api/templates/[id]
 *   PATCH  — update a template (name/description/body/default)
 *   DELETE — delete a template (refused if it is the last one)
 */
import { prisma } from "@/lib/db";
import { ok, noContent, parseJson, handle, HttpError } from "@/lib/api";
import { latexTemplateInputSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const input = await parseJson(request, latexTemplateInputSchema.partial());
    const existing = await prisma.latexTemplate.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, "Template not found.");

    const template = await prisma.$transaction(async (tx) => {
      if (input.isDefault) {
        await tx.latexTemplate.updateMany({ data: { isDefault: false } });
      }
      return tx.latexTemplate.update({ where: { id }, data: input });
    });
    return ok(template);
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const existing = await prisma.latexTemplate.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, "Template not found.");
    const count = await prisma.latexTemplate.count();
    if (count <= 1) {
      throw new HttpError(400, "Cannot delete the only remaining template.");
    }
    await prisma.latexTemplate.delete({ where: { id } });
    // If we removed the default, promote another template.
    if (existing.isDefault) {
      const next = await prisma.latexTemplate.findFirst();
      if (next) {
        await prisma.latexTemplate.update({
          where: { id: next.id },
          data: { isDefault: true },
        });
      }
    }
    return noContent();
  });
}
