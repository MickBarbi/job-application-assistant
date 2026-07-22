/**
 * Resume service — orchestrates generating a tailored resume for an
 * application: load inputs, run the AI generator, render LaTeX, optionally
 * compile a PDF, and persist a `GeneratedResume` (plus a timeline event).
 */
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/api";
import { getCompleter } from "@/lib/openai";
import { generateTailoredResume } from "@/lib/resume/generator";
import { compileLatexToPdf, PdfCompilationError } from "@/lib/resume/pdf";
import { masterResumeDataSchema } from "@/lib/validation";
import type { GenerateResumeInput } from "@/lib/validation";

export interface GenerateOutcome {
  id: string;
  rationale: string;
  model: string;
  pdfPath: string | null;
  /** Set when generation succeeded but PDF compilation was skipped/failed. */
  pdfWarning?: string;
}

/**
 * Resolves the master resume and template to use, falling back to the active
 * master resume and the default template when ids are omitted.
 */
async function resolveInputs(input: GenerateResumeInput) {
  const application = await prisma.application.findUnique({
    where: { id: input.applicationId },
    include: { jobPosting: true },
  });
  if (!application) throw new HttpError(404, "Application not found.");

  const masterResume = input.masterResumeId
    ? await prisma.masterResume.findUnique({
        where: { id: input.masterResumeId },
      })
    : await prisma.masterResume.findFirst({ where: { isActive: true } });
  if (!masterResume) {
    throw new HttpError(
      400,
      "No master resume found. Create one in Settings first."
    );
  }

  const template = input.templateId
    ? await prisma.latexTemplate.findUnique({ where: { id: input.templateId } })
    : ((await prisma.latexTemplate.findFirst({ where: { isDefault: true } })) ??
      (await prisma.latexTemplate.findFirst()));
  if (!template) {
    throw new HttpError(
      400,
      "No LaTeX template found. Add one in Settings first."
    );
  }

  return { application, masterResume, template };
}

export async function generateResumeForApplication(
  input: GenerateResumeInput
): Promise<GenerateOutcome> {
  const { application, masterResume, template } = await resolveInputs(input);

  const master = masterResumeDataSchema.parse(JSON.parse(masterResume.data));

  const { tailored, latex, model } = await generateTailoredResume(
    {
      master,
      job: {
        title: application.jobPosting.title,
        company: application.jobPosting.company,
        location: application.jobPosting.location,
        description: application.jobPosting.description,
      },
      templateBody: template.body,
    },
    getCompleter()
  );

  // Persist first (without PDF) so the generated resume is never lost even if
  // compilation fails.
  const record = await prisma.generatedResume.create({
    data: {
      applicationId: application.id,
      masterResumeId: masterResume.id,
      templateId: template.id,
      tailoredData: JSON.stringify(tailored),
      latexSource: latex,
      rationale: tailored.rationale,
      model,
    },
  });

  await prisma.applicationEvent.create({
    data: {
      applicationId: application.id,
      type: "resume_generated",
      message: `Generated a tailored resume with ${model}.`,
    },
  });

  const outcome: GenerateOutcome = {
    id: record.id,
    rationale: record.rationale,
    model: record.model,
    pdfPath: null,
  };

  if (input.compilePdf) {
    try {
      const { relativePath } = await compileLatexToPdf(latex, record.id);
      await prisma.generatedResume.update({
        where: { id: record.id },
        data: { pdfPath: relativePath },
      });
      outcome.pdfPath = relativePath;
    } catch (err) {
      // Non-fatal: keep the generated resume, surface a warning.
      outcome.pdfWarning =
        err instanceof PdfCompilationError
          ? err.message
          : "PDF compilation failed.";
    }
  }

  return outcome;
}

/** Loads a generated resume's full record (including LaTeX source). */
export async function getGeneratedResume(id: string) {
  const record = await prisma.generatedResume.findUnique({ where: { id } });
  if (!record) throw new HttpError(404, "Generated resume not found.");
  return record;
}
