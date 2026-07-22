/**
 * /api/jobs
 *   GET  — list all job postings (with application status)
 *   POST — create a job posting and its associated application
 */
import { prisma } from "@/lib/db";
import { ok, created, parseJson, handle } from "@/lib/api";
import { jobPostingInputSchema } from "@/lib/validation";

export async function GET() {
  return handle(async () => {
    const jobs = await prisma.jobPosting.findMany({
      orderBy: { createdAt: "desc" },
      include: { application: { select: { id: true, status: true } } },
    });
    return ok(jobs);
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    const input = await parseJson(request, jobPostingInputSchema);
    const job = await prisma.jobPosting.create({
      data: {
        ...input,
        application: {
          create: {
            status: "saved",
            events: {
              create: { type: "created", message: "Job saved." },
            },
          },
        },
      },
      include: { application: true },
    });
    return created(job);
  });
}
