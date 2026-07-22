# Roadmap

The project is built incrementally; each milestone is verified (typecheck +
tests) before the next begins.

## ✅ Milestone 1 — Foundation & core domain

- Project scaffolding: Next.js + TypeScript, Tailwind, ESLint, Vitest.
- Prisma data model (jobs, applications, events, master resume, templates,
  generated resumes) + client singleton + seed data.
- Core services: Zod validation, OpenAI `ChatCompleter` wrapper, LaTeX escaping
  & templating engine, PDF compilation service, resume-tailoring generator.
- Unit tests for escaping, templating, validation, and the generation pipeline.

## ✅ Milestone 2 — API layer

- REST routes for jobs (CRUD), applications (status + notes + timeline),
  master resumes, templates, and resume generation / PDF & `.tex` download.
- Consistent JSON error handling and Zod-validated request bodies.
- Service layer for status transitions (auto timeline events, `appliedAt`) and
  resume generation orchestration. Verified end-to-end against the dev server.

## ✅ Milestone 3 — Dashboard & UI

- App shell: layout with navigation, Tailwind styles, shared UI primitives, and
  a `StatusBadge` component.
- Dashboard with summary tiles, pipeline breakdown, recent jobs, and recent
  activity.
- Jobs list page.
- Add-job form (`/jobs/new`) that creates postings through the JSON API.
- Job/application detail page (`/jobs/[id]`) with inline status control, notes,
  timeline activity, tailored-resume generation, and generated-resume
  history/downloads.
- Settings page (`/settings`) for editing the active master resume and managing
  LaTeX templates.

## ✅ Milestone 4 — Hardening

- Automated integration tests for API routes against a test database, covering
  jobs, applications, master resume, templates, resume-generation
  misconfiguration, resume downloads, and optional auth middleware.
- Shared toast notifications and optimistic status-select feedback.
- Pagination and search/filtering on the jobs list.
- Optional single-user auth via `APP_AUTH_TOKEN` for non-local deployments.

## ✅ Settings polish

- Structured master-resume editor for contact info, summary, skills, experience,
  education, and projects.
- JSON payload preview remains available for advanced inspection/debugging.

## ✅ Resume-generation test hardening

- Successful generation route tests use fake OpenAI/PDF boundaries to verify
  generated-resume persistence, timeline-event creation, PDF path persistence,
  and non-fatal PDF warnings without network or LaTeX.

## ✅ Application throughput helpers

- Added job-detail application kits with a submission checklist and copy-ready
  recruiter/referral, follow-up, and tracking snippets.
- Kept helpers deterministic and covered by tests so they work without network or
  AI configuration.

## ✅ Job intake speed

- Added paste-to-prefill intake on `/jobs/new` so copied postings can populate
  title, company, location, URL, source, salary, and description before saving.
- Added deterministic parser coverage for labeled and common copied posting
  layouts.

## ✅ Deployment/operator readiness

- Added a Dockerfile and Compose setup for Next.js + Prisma SQLite with a
  persistent `/data` volume for the database and generated resume artifacts.
- Documented production env setup, Tectonic-first LaTeX/PDF installation,
  auth recommendations, backup guidance, and a deployment smoke-test checklist.

## 🔜 Next focus candidates

- Exercise the Docker path on the target host and tune image size/startup flow if
  needed.

## 💡 Backlog / ideas

- Import a posting by URL fetch/AI extraction beyond the current local paste parser.
- Cover-letter generation reusing the tailoring pipeline.
- Daily application batch mode with goals, keyboard shortcuts, and queue triage.
- Multiple master-resume variants and A/B comparison.
- Analytics: response rate by status, time-in-stage.
- Postgres deployment guide for operators who outgrow SQLite.
