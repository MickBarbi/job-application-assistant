/**
 * /api/jobs/[id]
 *   GET    — fetch a job with its application, timeline, and generated resumes
 *   PATCH  — update job posting fields
 *   DELETE — delete the job (cascades to application, events, resumes)
 */
import { prisma } from "@/lib/db";
import { ok, noContent, parseJson, handle, HttpError } from "@/lib/api";
import { jobPostingUpdateSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const job = await prisma.jobPosting.findUnique({
      where: { id },
      include: {
        application: {
          include: {
            events: { orderBy: { createdAt: "desc" } },
            generatedResumes: {
              orderBy: { createdAt: "desc" },
              select: {
                id: true,
                rationale: true,
                model: true,
                pdfPath: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });
    if (!job) throw new HttpError(404, "Job not found.");
    return ok(job);
  });
}

export async function PATCH(request: Request, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const input = await parseJson(request, jobPostingUpdateSchema);
    const existing = await prisma.jobPosting.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, "Job not found.");
    const job = await prisma.jobPosting.update({ where: { id }, data: input });
    return ok(job);
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const existing = await prisma.jobPosting.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, "Job not found.");
    await prisma.jobPosting.delete({ where: { id } });
    return noContent();
  });
}
