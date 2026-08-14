/**
 * API route integration tests against a throwaway SQLite database.
 *
 * These exercise the route handlers plus Prisma persistence so regressions in
 * validation, lifecycle event creation, and template invariants are caught
 * without hitting external services.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { PdfCompilationError } from "@/lib/resume/pdf";
import type { ResumeGenerationDependencies } from "@/lib/services/resume-service";

type JobsRoute = {
  GET: () => Promise<Response>;
  POST: (request: Request) => Promise<Response>;
};

type MasterResumeRoute = {
  GET: () => Promise<Response>;
  PUT: (request: Request) => Promise<Response>;
};

type TemplatesRoute = {
  GET: () => Promise<Response>;
  POST: (request: Request) => Promise<Response>;
};

type IdRoute = {
  GET?: (request: Request, context: RouteContext) => Promise<Response>;
  PATCH?: (request: Request, context: RouteContext) => Promise<Response>;
  DELETE?: (request: Request, context: RouteContext) => Promise<Response>;
};

type GenerateResumeRoute = {
  POST: (request: Request) => Promise<Response>;
};

type GenerateResumeRouteHandlerFactory = {
  createGenerateResumePostHandler: (
    dependencies?: ResumeGenerationDependencies
  ) => (request: Request) => Promise<Response>;
};

type RouteContext = { params: Promise<{ id: string }> };

let tempDir = "";
let prisma: PrismaClient;
let jobsRoute: JobsRoute;
let jobRoute: IdRoute;
let applicationRoute: IdRoute;
let masterResumeRoute: MasterResumeRoute;
let templatesRoute: TemplatesRoute;
let templateRoute: IdRoute;
let generateResumeRoute: GenerateResumeRoute;
let generateResumeRouteHandlerFactory: GenerateResumeRouteHandlerFactory;
let resumeTexRoute: IdRoute;
let resumePdfRoute: IdRoute;

beforeAll(async () => {
  tempDir = mkdtempSync(join(tmpdir(), "jaa-api-tests-"));
  process.env.DATABASE_URL = `file:${join(tempDir, "test.db")}`;
  process.env.OPENAI_API_KEY = "";

  // Run the Prisma CLI via Node directly rather than `npx` so the schema push
  // works cross-platform. On Windows `npx` resolves to `npx.cmd`, which
  // execFileSync cannot spawn without a shell; invoking the CLI entry point
  // with process.execPath avoids that platform-specific resolution entirely.
  const prismaCli = join(process.cwd(), "node_modules", "prisma", "build", "index.js");
  execFileSync(process.execPath, [prismaCli, "db", "push", "--skip-generate"], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "pipe",
  });

  ({ prisma } = await import("@/lib/db"));
  jobsRoute = await import("@/app/api/jobs/route");
  jobRoute = await import("@/app/api/jobs/[id]/route");
  applicationRoute = await import("@/app/api/applications/[id]/route");
  masterResumeRoute = await import("@/app/api/master-resume/route");
  templatesRoute = await import("@/app/api/templates/route");
  templateRoute = await import("@/app/api/templates/[id]/route");
  generateResumeRoute = await import("@/app/api/resumes/generate/route");
  generateResumeRouteHandlerFactory = await import("@/lib/services/resume-route-handler");
  resumeTexRoute = await import("@/app/api/resumes/[id]/tex/route");
  resumePdfRoute = await import("@/app/api/resumes/[id]/pdf/route");
});

afterAll(async () => {
  // `prisma` may be undefined if beforeAll failed before importing the client;
  // guard so teardown surfaces the real setup error instead of a $disconnect crash.
  await prisma?.$disconnect();
  if (tempDir) {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

describe("job routes", () => {
  it("creates a job with its application and initial timeline event", async () => {
    const response = await jobsRoute.POST(jsonRequest("/api/jobs", {
      title: "Staff Product Engineer",
      company: "Example Health",
      location: "Remote",
      url: "https://example.com/jobs/staff-product-engineer",
      source: "Referral",
      description: "Build patient-facing product workflows.",
      salaryRange: "$180k–$210k",
      notes: "Follow up with Alex.",
    }));

    expect(response.status).toBe(201);
    const body = asRecord(await response.json());
    const id = expectString(body.id);

    const stored = await prisma.jobPosting.findUnique({
      where: { id },
      include: { application: { include: { events: true } } },
    });

    expect(stored?.title).toBe("Staff Product Engineer");
    expect(stored?.application?.status).toBe("saved");
    expect(stored?.application?.events).toHaveLength(1);
    expect(stored?.application?.events[0]?.type).toBe("created");
  });

  it("returns validation errors for invalid job input", async () => {
    const response = await jobsRoute.POST(jsonRequest("/api/jobs", {
      title: "",
      company: "",
      url: "not a url",
    }));

    expect(response.status).toBe(400);
    expect(asRecord(await response.json()).error).toBe("Validation failed.");
  });

  it("updates and deletes a job through the item route", async () => {
    const job = await prisma.jobPosting.create({
      data: {
        title: "Frontend Engineer",
        company: "Delete Me Inc",
        application: {
          create: {
            status: "saved",
            events: { create: { type: "created", message: "Created." } },
          },
        },
      },
      include: { application: true },
    });

    if (!job.application) throw new Error("Expected created application.");
    const applicationId = job.application.id;
    const patch = requireHandler(jobRoute.PATCH);
    const patched = await patch(jsonRequest(`/api/jobs/${job.id}`, {
      title: "Senior Frontend Engineer",
      notes: "Updated notes",
    }), context(job.id));

    expect(patched.status).toBe(200);
    expect(asRecord(await patched.json()).title).toBe("Senior Frontend Engineer");

    const del = requireHandler(jobRoute.DELETE);
    const deleted = await del(new Request(`http://test/api/jobs/${job.id}`), context(job.id));

    expect(deleted.status).toBe(204);
    expect(await prisma.jobPosting.findUnique({ where: { id: job.id } })).toBeNull();
    expect(await prisma.application.findUnique({ where: { id: applicationId } })).toBeNull();
  });
});

describe("application routes", () => {
  it("records status transitions and sets appliedAt once", async () => {
    const application = await createApplication();
    const patch = requireHandler(applicationRoute.PATCH);

    const applied = await patch(jsonRequest(`/api/applications/${application.id}`, {
      status: "applied",
    }), context(application.id));

    expect(applied.status).toBe(200);
    const afterApplied = await prisma.application.findUnique({
      where: { id: application.id },
      include: { events: true },
    });
    const firstAppliedAt = afterApplied?.appliedAt;

    expect(afterApplied?.status).toBe("applied");
    expect(firstAppliedAt).toBeInstanceOf(Date);
    expect(afterApplied?.events.some((event) => event.type === "status_changed")).toBe(true);

    const interview = await patch(jsonRequest(`/api/applications/${application.id}`, {
      status: "interview",
      notes: "Recruiter screen scheduled.",
    }), context(application.id));

    expect(interview.status).toBe(200);
    const afterInterview = await prisma.application.findUnique({
      where: { id: application.id },
      include: { events: true },
    });

    expect(afterInterview?.status).toBe("interview");
    expect(afterInterview?.notes).toBe("Recruiter screen scheduled.");
    expect(afterInterview?.appliedAt?.toISOString()).toBe(firstAppliedAt?.toISOString());
    expect(afterInterview?.events.filter((event) => event.type === "status_changed")).toHaveLength(2);
  });
});

describe("master resume route", () => {
  it("saves and returns a validated active master resume", async () => {
    const response = await masterResumeRoute.PUT(jsonRequest("/api/master-resume", {
      label: "Integration resume",
      data: minimalResume(),
    }));

    expect(response.status).toBe(200);
    expect(asRecord(await response.json()).label).toBe("Integration resume");

    const getResponse = await masterResumeRoute.GET();
    const body = asRecord(await getResponse.json());
    const data = asRecord(body.data);
    const contact = asRecord(data.contact);

    expect(getResponse.status).toBe(200);
    expect(body.label).toBe("Integration resume");
    expect(contact.email).toBe("casey@example.com");
  });

  it("rejects invalid resume data", async () => {
    const response = await masterResumeRoute.PUT(jsonRequest("/api/master-resume", {
      label: "Invalid",
      data: { contact: { name: "No Email", email: "not-an-email" } },
    }));

    expect(response.status).toBe(400);
    expect(asRecord(await response.json()).error).toBe("Validation failed.");
  });
});

describe("template routes", () => {
  it("creates a default template and moves the default on update", async () => {
    const first = await templatesRoute.POST(jsonRequest("/api/templates", {
      name: "First Template",
      description: "First",
      body: "Hello {{contact.name}}",
      isDefault: false,
    }));
    const second = await templatesRoute.POST(jsonRequest("/api/templates", {
      name: "Second Template",
      description: "Second",
      body: "Hi {{contact.name}}",
      isDefault: true,
    }));

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);

    const firstId = expectString(asRecord(await first.json()).id);
    const secondId = expectString(asRecord(await second.json()).id);
    const patch = requireHandler(templateRoute.PATCH);

    const makeFirstDefault = await patch(jsonRequest(`/api/templates/${firstId}`, {
      isDefault: true,
    }), context(firstId));

    expect(makeFirstDefault.status).toBe(200);
    const templates = await prisma.latexTemplate.findMany({ orderBy: { name: "asc" } });

    expect(templates.find((template) => template.id === firstId)?.isDefault).toBe(true);
    expect(templates.find((template) => template.id === secondId)?.isDefault).toBe(false);
  });

  it("refuses to delete the only remaining template", async () => {
    await prisma.generatedResume.deleteMany();
    await prisma.latexTemplate.deleteMany();
    const only = await prisma.latexTemplate.create({
      data: {
        name: "Only Template",
        body: "{{contact.name}}",
        isDefault: true,
      },
    });
    const del = requireHandler(templateRoute.DELETE);

    const response = await del(new Request(`http://test/api/templates/${only.id}`), context(only.id));

    expect(response.status).toBe(400);
    expect(asRecord(await response.json()).error).toBe("Cannot delete the only remaining template.");
  });
});


describe("resume routes", () => {
  it("returns a clear 503 when OpenAI is not configured for generation", async () => {
    const application = await createApplication();
    await prisma.masterResume.create({
      data: {
        label: "Generation source",
        data: JSON.stringify(minimalResume()),
        isActive: true,
      },
    });
    await prisma.latexTemplate.create({
      data: {
        name: "Generation template",
        body: "{{contact.name}}",
        isDefault: true,
      },
    });

    const response = await generateResumeRoute.POST(jsonRequest("/api/resumes/generate", {
      applicationId: application.id,
      compilePdf: false,
    }));

    expect(response.status).toBe(503);
    expect(asRecord(await response.json()).error).toContain("OPENAI_API_KEY");
  });


  it("persists a generated resume, timeline event, and PDF path on success", async () => {
    const { application, masterResume, template } = await createGenerationInputs();
    const post = generateResumeRouteHandlerFactory.createGenerateResumePostHandler(fakeGenerationDependencies({
      compile: async (_latexSource, id) => ({
        pdfPath: `/tmp/${id}.pdf`,
        relativePath: `resumes/${id}.pdf`,
      }),
    }));

    const response = await post(jsonRequest("/api/resumes/generate", {
      applicationId: application.id,
      masterResumeId: masterResume.id,
      templateId: template.id,
      compilePdf: true,
    }));

    expect(response.status).toBe(201);
    const body = asRecord(await response.json());
    const resumeId = expectString(body.id);
    const stored = await prisma.generatedResume.findUnique({ where: { id: resumeId } });
    const event = await prisma.applicationEvent.findFirst({
      where: { applicationId: application.id, type: "resume_generated" },
    });

    expect(body.model).toBe("fake-route-model");
    expect(body.pdfPath).toBe(`resumes/${resumeId}.pdf`);
    expect(stored?.pdfPath).toBe(`resumes/${resumeId}.pdf`);
    expect(stored?.latexSource).toContain("Tailored integration summary");
    expect(stored?.rationale).toBe("Matched the posting with existing facts.");
    expect(event?.message).toContain("fake-route-model");
  });

  it("persists the generated resume before surfacing a PDF warning", async () => {
    const { application, masterResume, template } = await createGenerationInputs();
    const post = generateResumeRouteHandlerFactory.createGenerateResumePostHandler(fakeGenerationDependencies({
      compile: async () => {
        throw new PdfCompilationError("Fake PDF engine unavailable.");
      },
    }));

    const response = await post(jsonRequest("/api/resumes/generate", {
      applicationId: application.id,
      masterResumeId: masterResume.id,
      templateId: template.id,
      compilePdf: true,
    }));

    expect(response.status).toBe(201);
    const body = asRecord(await response.json());
    const resumeId = expectString(body.id);
    const stored = await prisma.generatedResume.findUnique({ where: { id: resumeId } });

    expect(body.pdfPath).toBeNull();
    expect(body.pdfWarning).toBe("Fake PDF engine unavailable.");
    expect(stored?.pdfPath).toBeNull();
    expect(stored?.latexSource).toContain("Tailored integration summary");
  });

  it("downloads generated LaTeX and reports missing PDFs clearly", async () => {
    const resume = await createGeneratedResume({ pdfPath: null });
    const getTex = requireHandler(resumeTexRoute.GET);
    const getPdf = requireHandler(resumePdfRoute.GET);

    const texResponse = await getTex(new Request(`http://test/api/resumes/${resume.id}/tex`), context(resume.id));
    const noPdfResponse = await getPdf(new Request(`http://test/api/resumes/${resume.id}/pdf`), context(resume.id));

    expect(texResponse.status).toBe(200);
    expect(await texResponse.text()).toBe("\\documentclass{article}");
    expect(noPdfResponse.status).toBe(404);
    expect(asRecord(await noPdfResponse.json()).error).toContain("No compiled PDF");
  });

  it("returns 410 when a stored PDF path is missing from disk", async () => {
    const resume = await createGeneratedResume({ pdfPath: "resumes/missing.pdf" });
    const getPdf = requireHandler(resumePdfRoute.GET);

    const response = await getPdf(new Request(`http://test/api/resumes/${resume.id}/pdf`), context(resume.id));

    expect(response.status).toBe(410);
    expect(asRecord(await response.json()).error).toBe("PDF file is missing from storage.");
  });
});

function jsonRequest(path: string, body: unknown) {
  return new Request(`http://test${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function context(id: string): RouteContext {
  return { params: Promise.resolve({ id }) };
}

function requireHandler<T extends (...args: never[]) => Promise<Response>>(
  handler: T | undefined
): T {
  if (!handler) throw new Error("Route handler is not defined.");
  return handler;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null) {
    throw new Error("Expected an object response.");
  }
  return value as Record<string, unknown>;
}

function expectString(value: unknown): string {
  expect(typeof value).toBe("string");
  return value as string;
}

async function createApplication() {
  const job = await prisma.jobPosting.create({
    data: {
      title: "Lifecycle Test Engineer",
      company: "Workflow Co",
      application: {
        create: {
          status: "saved",
          events: { create: { type: "created", message: "Created." } },
        },
      },
    },
    include: { application: true },
  });

  if (!job.application) throw new Error("Expected created application.");
  return job.application;
}

async function createGenerationInputs() {
  const application = await createApplication();
  const masterResume = await prisma.masterResume.create({
    data: {
      label: "Generation source",
      data: JSON.stringify(minimalResume()),
      isActive: false,
    },
  });
  const template = await prisma.latexTemplate.create({
    data: {
      name: "Generation template",
      body: "{{contact.name}}\n{{summary}}",
      isDefault: false,
    },
  });

  return { application, masterResume, template };
}

function fakeGenerationDependencies({
  compile,
}: {
  compile: ResumeGenerationDependencies["compileLatexToPdf"];
}): ResumeGenerationDependencies {
  return {
    getCompleter: () => ({
      model: "fake-route-model",
      complete: async () => JSON.stringify({
        ...minimalResume(),
        summary: "Tailored integration summary",
        rationale: "Matched the posting with existing facts.",
      }),
    }),
    compileLatexToPdf: compile,
  };
}

async function createGeneratedResume({ pdfPath }: { pdfPath: string | null }) {
  const application = await createApplication();
  const masterResume = await prisma.masterResume.create({
    data: {
      label: "Download source",
      data: JSON.stringify(minimalResume()),
      isActive: true,
    },
  });
  const template = await prisma.latexTemplate.create({
    data: {
      name: "Download template",
      body: "{{contact.name}}",
      isDefault: false,
    },
  });

  return prisma.generatedResume.create({
    data: {
      applicationId: application.id,
      masterResumeId: masterResume.id,
      templateId: template.id,
      tailoredData: JSON.stringify({ ...minimalResume(), rationale: "Test" }),
      latexSource: "\\documentclass{article}",
      pdfPath,
      rationale: "Test",
      model: "fake-model",
    },
  });
}

function minimalResume() {
  return {
    contact: {
      name: "Casey Candidate",
      email: "casey@example.com",
      phone: "",
      location: "Remote",
      website: "",
      linkedin: "",
      github: "",
    },
    summary: "Product-minded engineer.",
    skills: ["TypeScript", "React"],
    experience: [],
    education: [],
    projects: [],
  };
}
