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

## 🔜 Milestone 4 — Hardening (planned)

- Automated integration tests for API routes against a test database.
- Optimistic UI updates and toast notifications.
- Pagination and search/filtering on the jobs list.
- Auth (single-user API token) for non-local deployments.

## 💡 Backlog / ideas

- Import a posting by pasting a URL or job description (AI extraction).
- Cover-letter generation reusing the tailoring pipeline.
- Multiple master-resume variants and A/B comparison.
- Analytics: response rate by status, time-in-stage.
- Postgres deployment guide and Dockerfile.
