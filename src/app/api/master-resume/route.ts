/**
 * /api/master-resume
 *   GET — fetch the active master resume (parsed)
 *   PUT — create or replace the active master resume
 */
import { prisma } from "@/lib/db";
import { ok, parseJson, handle } from "@/lib/api";
import { masterResumeInputSchema, masterResumeDataSchema } from "@/lib/validation";

export async function GET() {
  return handle(async () => {
    const resume = await prisma.masterResume.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: "desc" },
    });
    if (!resume) return ok(null);
    return ok({
      id: resume.id,
      label: resume.label,
      data: masterResumeDataSchema.parse(JSON.parse(resume.data)),
      updatedAt: resume.updatedAt,
    });
  });
}

export async function PUT(request: Request) {
  return handle(async () => {
    const input = await parseJson(request, masterResumeInputSchema);
    const existing = await prisma.masterResume.findFirst({
      where: { isActive: true },
    });

    const data = {
      label: input.label,
      data: JSON.stringify(input.data),
      isActive: true,
    };

    const resume = existing
      ? await prisma.masterResume.update({ where: { id: existing.id }, data })
      : await prisma.masterResume.create({ data });

    return ok({ id: resume.id, label: resume.label, updatedAt: resume.updatedAt });
  });
}
