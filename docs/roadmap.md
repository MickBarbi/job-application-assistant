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

## 🔜 Milestone 2 — API layer

- REST routes for jobs (CRUD), applications (status + notes + timeline),
  master resumes, templates, and resume generation / PDF & `.tex` download.
- Consistent JSON error handling and Zod-validated request bodies.

## 🔜 Milestone 3 — Dashboard & UI

- Dashboard with pipeline stats and recent activity.
- Jobs: list, create, detail with inline status control.
- Application timeline and generated-resume history with download links.
- Settings: edit the master resume and manage LaTeX templates.

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
