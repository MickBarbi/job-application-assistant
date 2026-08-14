/**
 * Cover-letter service — orchestrates generating a tailored cover letter for an
 * application: load inputs, run the AI generator, and persist a
 * `GeneratedCoverLetter` (plus a timeline event).
 *
 * Unlike resume generation there is no LaTeX/PDF step: cover letters are plain
 * text meant to be copied into an application form or downloaded as `.txt`.
 */
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/api";
import { getCompleter, type ChatCompleter } from "@/lib/openai";
import { generateCoverLetter } from "@/lib/coverletter/generator";
import { masterResumeDataSchema } from "@/lib/validation";
import type { GenerateCoverLetterInput } from "@/lib/validation";

export interface CoverLetterOutcome {
  id: string;
  body: string;
  rationale: string;
  model: string;
}

export interface CoverLetterGenerationDependencies {
  getCompleter: () => ChatCompleter;
}

const defaultDependencies: CoverLetterGenerationDependencies = {
  getCompleter,
};

/**
 * Resolves the application and master resume to use, falling back to the active
 * master resume when no id is provided.
 */
async function resolveInputs(input: GenerateCoverLetterInput) {
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

  return { application, masterResume };
}

export async function generateCoverLetterForApplication(
  input: GenerateCoverLetterInput,
  dependencies: CoverLetterGenerationDependencies = defaultDependencies
): Promise<CoverLetterOutcome> {
  const { application, masterResume } = await resolveInputs(input);

  const master = masterResumeDataSchema.parse(JSON.parse(masterResume.data));

  const { data, body, model } = await generateCoverLetter(
    {
      master,
      job: {
        title: application.jobPosting.title,
        company: application.jobPosting.company,
        location: application.jobPosting.location,
        description: application.jobPosting.description,
      },
      tone: input.tone,
    },
    dependencies.getCompleter()
  );

  const record = await prisma.generatedCoverLetter.create({
    data: {
      applicationId: application.id,
      masterResumeId: masterResume.id,
      body,
      structured: JSON.stringify(data),
      tone: input.tone,
      rationale: data.rationale,
      model,
    },
  });

  await prisma.applicationEvent.create({
    data: {
      applicationId: application.id,
      type: "cover_letter_generated",
      message: `Generated a ${input.tone} cover letter with ${model}.`,
    },
  });

  return {
    id: record.id,
    body: record.body,
    rationale: record.rationale,
    model: record.model,
  };
}

/** Loads a generated cover letter's full record. */
export async function getGeneratedCoverLetter(id: string) {
  const record = await prisma.generatedCoverLetter.findUnique({ where: { id } });
  if (!record) throw new HttpError(404, "Generated cover letter not found.");
  return record;
}
