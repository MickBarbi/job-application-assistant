/**
 * Zod schemas — the single source of truth for the structured data shapes used
 * across the app (master resume, tailored resume, API request bodies).
 *
 * TypeScript types are inferred from these schemas so validation and typing can
 * never drift apart.
 */
import { z } from "zod";
import { APPLICATION_STATUSES, COVER_LETTER_TONES } from "./types";

/* -------------------------------------------------------------------------- */
/* Resume data                                                                */
/* -------------------------------------------------------------------------- */

export const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email().or(z.literal("")),
  phone: z.string().default(""),
  location: z.string().default(""),
  website: z.string().default(""),
  linkedin: z.string().default(""),
  github: z.string().default(""),
});

export const experienceSchema = z.object({
  company: z.string().min(1),
  title: z.string().min(1),
  location: z.string().default(""),
  startDate: z.string().default(""),
  endDate: z.string().default(""),
  /** Bullet points describing accomplishments. */
  highlights: z.array(z.string()).default([]),
});

export const educationSchema = z.object({
  institution: z.string().min(1),
  degree: z.string().default(""),
  field: z.string().default(""),
  startDate: z.string().default(""),
  endDate: z.string().default(""),
  details: z.string().default(""),
});

export const projectSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(""),
  url: z.string().default(""),
  highlights: z.array(z.string()).default([]),
});

/**
 * The canonical, structured resume authored by the user. This is the raw
 * material the AI tailors per job.
 */
export const masterResumeDataSchema = z.object({
  contact: contactSchema,
  summary: z.string().default(""),
  skills: z.array(z.string()).default([]),
  experience: z.array(experienceSchema).default([]),
  education: z.array(educationSchema).default([]),
  projects: z.array(projectSchema).default([]),
});

export type MasterResumeData = z.infer<typeof masterResumeDataSchema>;
export type ResumeExperience = z.infer<typeof experienceSchema>;
export type ResumeEducation = z.infer<typeof educationSchema>;
export type ResumeProject = z.infer<typeof projectSchema>;
export type ResumeContact = z.infer<typeof contactSchema>;

/**
 * The tailored resume produced by the AI. It reuses the master shape but adds a
 * short rationale explaining the changes. The AI must only rephrase, reorder,
 * and select from the master — never invent employers, titles, or dates.
 */
export const tailoredResumeDataSchema = masterResumeDataSchema.extend({
  rationale: z
    .string()
    .default("")
    .describe("Short explanation of how the resume was tailored to the job."),
});

export type TailoredResumeData = z.infer<typeof tailoredResumeDataSchema>;

/* -------------------------------------------------------------------------- */
/* Cover letter data                                                          */
/* -------------------------------------------------------------------------- */

/**
 * The structured cover letter produced by the AI. Kept as discrete pieces so
 * the app can assemble the final text deterministically (and re-render it in
 * other formats later). As with resumes, the AI may only draw on facts already
 * present in the master resume — it must never invent experience or claims.
 */
export const coverLetterDataSchema = z.object({
  greeting: z.string().default("Dear Hiring Manager,"),
  /** Body paragraphs, in order. At least one is required. */
  paragraphs: z.array(z.string().min(1)).min(1, "At least one paragraph is required"),
  closing: z.string().default("Sincerely,"),
  rationale: z
    .string()
    .default("")
    .describe("Short explanation of how the letter was tailored to the job."),
});

export type CoverLetterData = z.infer<typeof coverLetterDataSchema>;

/* -------------------------------------------------------------------------- */
/* API request bodies                                                         */
/* -------------------------------------------------------------------------- */

export const jobPostingInputSchema = z.object({
  title: z.string().min(1, "Title is required"),
  company: z.string().min(1, "Company is required"),
  location: z.string().default(""),
  url: z.string().url().or(z.literal("")).default(""),
  source: z.string().default(""),
  description: z.string().default(""),
  salaryRange: z.string().default(""),
  notes: z.string().default(""),
});

export type JobPostingInput = z.infer<typeof jobPostingInputSchema>;

export const jobPostingUpdateSchema = jobPostingInputSchema.partial();

export const applicationUpdateSchema = z.object({
  status: z.enum(APPLICATION_STATUSES).optional(),
  notes: z.string().optional(),
  nextActionAt: z.string().datetime().nullable().optional(),
});

export type ApplicationUpdateInput = z.infer<typeof applicationUpdateSchema>;

export const masterResumeInputSchema = z.object({
  label: z.string().min(1).default("Default"),
  data: masterResumeDataSchema,
});

export const latexTemplateInputSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().default(""),
  body: z.string().min(1, "Template body is required"),
  isDefault: z.boolean().default(false),
});

export type LatexTemplateInput = z.infer<typeof latexTemplateInputSchema>;

export const generateResumeInputSchema = z.object({
  applicationId: z.string().min(1),
  masterResumeId: z.string().optional(),
  templateId: z.string().optional(),
  /** When true, attempt to compile the LaTeX to PDF after generation. */
  compilePdf: z.boolean().default(true),
});

export type GenerateResumeInput = z.infer<typeof generateResumeInputSchema>;

export const generateCoverLetterInputSchema = z.object({
  applicationId: z.string().min(1),
  masterResumeId: z.string().optional(),
  tone: z.enum(COVER_LETTER_TONES).default("professional"),
});

export type GenerateCoverLetterInput = z.infer<
  typeof generateCoverLetterInputSchema
>;

export const coverLetterUpdateSchema = z.object({
  // Trim first so a whitespace-only body is rejected and never stored.
  body: z.string().trim().min(1, "Cover letter cannot be empty").max(20000),
});

export type CoverLetterUpdateInput = z.infer<typeof coverLetterUpdateSchema>;
