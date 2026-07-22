# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/), and the project is built
incrementally milestone by milestone.

## [Unreleased]

### Milestone 1 — Foundation & core domain

Added:

- Project scaffolding: Next.js 15 (App Router) + TypeScript, Tailwind CSS,
  ESLint, Vitest, and npm scripts.
- Prisma schema and SQLite datasource modelling job postings, applications,
  application events, master resumes, LaTeX templates, and generated resumes.
- Prisma client singleton (`src/lib/db.ts`) and an idempotent seed script with a
  sample master resume, default LaTeX template, and example jobs.
- Environment configuration helper (`src/lib/env.ts`) and `.env.example`.
- Zod validation schemas as the single source of truth for domain shapes
  (`src/lib/validation.ts`).
- OpenAI wrapper behind a `ChatCompleter` interface (`src/lib/openai.ts`).
- Dependency-free LaTeX escaping and Mustache-style template engine
  (`src/lib/resume/latex.ts`).
- PDF compilation service that shells out to tectonic/pdflatex/xelatex with
  graceful degradation (`src/lib/resume/pdf.ts`).
- Resume-tailoring generator with an anti-fabrication system prompt
  (`src/lib/resume/generator.ts`).
- 32 unit tests covering escaping, templating, validation, and the generation
  pipeline (fake completer, no network).
- Documentation: README, architecture, and roadmap.
