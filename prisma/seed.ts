/**
 * Seeds the database with a default LaTeX template, a sample master resume, and
 * a couple of example job postings so the app is usable immediately after
 * `npm run db:seed`. Idempotent: safe to run multiple times.
 */
import { PrismaClient } from "@prisma/client";
import {
  DEFAULT_TEMPLATE_BODY,
  SAMPLE_MASTER_RESUME,
} from "../src/lib/resume/defaults";

const prisma = new PrismaClient();

async function main() {
  // Default LaTeX template.
  const templateCount = await prisma.latexTemplate.count();
  if (templateCount === 0) {
    await prisma.latexTemplate.create({
      data: {
        name: "Classic Single Column",
        description:
          "A clean, ATS-friendly single-column resume that compiles with a stock LaTeX install.",
        body: DEFAULT_TEMPLATE_BODY,
        isDefault: true,
      },
    });
    console.log("✓ Seeded default LaTeX template");
  }

  // Sample master resume.
  const resumeCount = await prisma.masterResume.count();
  if (resumeCount === 0) {
    await prisma.masterResume.create({
      data: {
        label: "Sample master resume",
        data: JSON.stringify(SAMPLE_MASTER_RESUME),
        isActive: true,
      },
    });
    console.log("✓ Seeded sample master resume");
  }

  // Example job postings + applications.
  const jobCount = await prisma.jobPosting.count();
  if (jobCount === 0) {
    const examples = [
      {
        title: "Senior Frontend Engineer",
        company: "Aurora Health",
        location: "Remote (US)",
        source: "LinkedIn",
        description:
          "We are looking for a senior frontend engineer with deep React and TypeScript experience to build patient-facing web experiences. Bonus: Next.js, accessibility, design systems.",
        salaryRange: "$150k–$185k",
        status: "applied",
      },
      {
        title: "Platform Engineer",
        company: "Cobalt Systems",
        location: "San Francisco, CA",
        source: "Referral",
        description:
          "Own our deployment pipelines and cloud infrastructure. Strong AWS, Docker, and CI/CD skills required.",
        salaryRange: "$160k–$200k",
        status: "saved",
      },
    ];

    for (const ex of examples) {
      await prisma.jobPosting.create({
        data: {
          title: ex.title,
          company: ex.company,
          location: ex.location,
          source: ex.source,
          description: ex.description,
          salaryRange: ex.salaryRange,
          application: {
            create: {
              status: ex.status,
              appliedAt: ex.status === "applied" ? new Date() : null,
              events: {
                create: {
                  type: "created",
                  message: "Application created from seed data.",
                },
              },
            },
          },
        },
      });
    }
    console.log("✓ Seeded example job postings");
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
