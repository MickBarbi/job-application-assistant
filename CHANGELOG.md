# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/), and the project is built
incrementally milestone by milestone.

## [Unreleased]

### Testing

Fixed:

- Made the API route integration tests (`tests/api-routes.test.ts`) run
  cross-platform by invoking the Prisma CLI via `process.execPath` instead of
  `npx`, which could not be spawned on Windows without a shell and left the 13
  API tests skipped with a misleading `$disconnect` teardown crash. Guarded
  `afterAll` so a setup failure surfaces the real error. Full suite: 56/56 pass.

### Application throughput

Added:

- Added an application kit to job detail pages with a per-job submission
  checklist and copy-ready recruiter, follow-up, and tracking snippets.
- Added deterministic tests for application-kit checklist and snippet builders.

### Job intake speed

Added:

- Added a paste-to-prefill workflow on the add-job form that extracts common
  fields from copied job postings without requiring network or AI calls.
- Added deterministic parser tests for labeled postings, common copied posting
  layouts, and safe merging into the add-job form state.

### Deployment/operator readiness

Added:

- Added Docker and Docker Compose deployment assets for a Node.js 22 production
  app with Prisma SQLite data and generated resumes persisted under `/data`.
- Added production deployment documentation covering required environment
  variables, optional single-user auth, Tectonic-first PDF compilation, backups,
  and a smoke-test checklist.

### Documentation

Changed:

- Refreshed `docs/HANDOFF.md` for the next Codex session with the `main` branch
  rename, local branch-sync guidance, current test count, optional auth env var,
  and updated repository structure.

### Resume-generation test hardening

Added:

- Added dependency injection seams for the resume generation service and route
  handler so successful generation can be tested with fake OpenAI/PDF
  boundaries.
- Added integration tests for successful resume generation, PDF path persistence,
  timeline-event creation, and non-fatal PDF warning behavior.

### Settings polish

Added:

- Replaced the raw master-resume JSON editor with structured Settings sections
  for contact info, summary, skills, experience, education, and projects while
  preserving the validated `PUT /api/master-resume` save path.
- Added tested pure helpers for repeatable resume-editor state operations and
  multiline list normalization.

### Milestone 4 — Hardening

Added:

- API route integration tests against a throwaway SQLite database covering job
  creation/update/delete, application status transitions, master-resume
  validation, LaTeX template default/delete invariants, resume generation
  misconfiguration, and resume download fallbacks.
- Optional single-user authentication via `APP_AUTH_TOKEN`, accepting bearer
  tokens and browser-friendly HTTP Basic auth.
- Jobs list search, status filtering, and pagination.
- Shared toast notifications for client-side mutation feedback.

### Milestone 3 — Dashboard & UI

Added:

- App shell: root layout with navigation and global Tailwind styles.
- `StatusBadge` component and shared UI utility classes.
- Dashboard page: summary tiles, pipeline breakdown, recent jobs, and recent
  activity (server component reading via Prisma).
- Jobs list page.
- Add-job form (`/jobs/new`) that saves postings through `POST /api/jobs` and
  redirects to the created job detail page.
- Job/application detail page (`/jobs/[id]`) with posting details, inline status
  updates, notes editing, timeline activity, tailored-resume generation, and
  PDF/`.tex` download links for generated resumes.
- Settings page (`/settings`) for editing the active master resume JSON and
  managing LaTeX templates, including default selection and template deletion.

Changed:

- Documented the completed Milestone 3 UI in README, roadmap, and handoff
  notes.

Remaining polish for this milestone: fuller feedback patterns such as shared
toasts/optimistic updates. Tracked in the roadmap.

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
