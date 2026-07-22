# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/), and the project is built
incrementally milestone by milestone.

## [Unreleased]

### Milestone 3 — Dashboard & UI (in progress)

Added:

- App shell: root layout with navigation and global Tailwind styles.
- `StatusBadge` component and shared UI utility classes.
- Dashboard page: summary tiles, pipeline breakdown, recent jobs, and recent
  activity (server component reading via Prisma).
- Jobs list page.

Remaining for this milestone: add-job form, job/application detail page, and the
settings page (master resume + templates). Tracked in the roadmap.

### Milestone 2 — API layer

Added:

- JSON API helpers with uniform error handling, a `HttpError` type, and
  Zod-validated request-body parsing (`src/lib/api.ts`).
- Application service recording timeline events on every status change and
  auto-setting `appliedAt` (`src/lib/services/applications.ts`).
- Resume-generation service orchestrating AI tailoring, LaTeX rendering,
  optional PDF compilation, and persistence (`src/lib/services/resume-service.ts`).
- REST routes:
  - `GET/POST /api/jobs`, `GET/PATCH/DELETE /api/jobs/[id]`
  - `GET/PATCH /api/applications/[id]`
  - `GET/PUT /api/master-resume`
  - `GET/POST /api/templates`, `PATCH/DELETE /api/templates/[id]`
  - `POST /api/resumes/generate`
  - `GET /api/resumes/[id]/pdf`, `GET /api/resumes/[id]/tex`
  - `GET /api/stats`
- Verified end-to-end against the dev server (create/list, status transitions
  with timeline, validation errors, and graceful 503 when OpenAI is unconfigured).

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
