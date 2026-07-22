# Job Application Assistant

An AI-powered system for managing a job search end to end:

- **Track job postings** and the status of every application (saved → applied →
  interview → offer → accepted/rejected) with a timeline of events.
- **Generate tailored resumes** from a single *master resume* and a LaTeX
  template, using the OpenAI API to rephrase, reorder, and select the most
  relevant content for each posting — without fabricating facts.
- **Export PDFs** by compiling the generated LaTeX with a local engine
  (tectonic / pdflatex / xelatex).
- **A clean dashboard** summarising your pipeline at a glance.

Built with **Next.js (App Router) + TypeScript**, **Prisma + SQLite**, **Zod**,
and **Vitest**.

> **Status:** built incrementally. The core browser UI is complete, Milestone 4
> hardening is in place with route integration tests, optional single-user auth,
> jobs filtering/pagination, and shared toast feedback. See
> [`CHANGELOG.md`](./CHANGELOG.md) for what exists today and
> [`docs/roadmap.md`](./docs/roadmap.md) for what's planned.

---

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
#    then edit .env and set OPENAI_API_KEY (required for AI tailoring)

# 3. Create and seed the database
npm run db:push      # create the SQLite schema
npm run db:seed      # add a sample master resume, template, and jobs

# 4. Run the app
npm run dev          # http://localhost:3000
```

### Optional: PDF generation

PDF export compiles LaTeX with an external engine. Install one of:

- [**Tectonic**](https://tectonic-typesetting.github.io/) (recommended,
  self-contained): `LATEX_ENGINE=tectonic`
- **TeX Live** / **MiKTeX** for `pdflatex` or `xelatex`.

If no engine is installed, resume generation still works and you can download
the raw `.tex`; only the PDF step is skipped with a clear message.

---

## Scripts

| Command              | Description                                     |
| -------------------- | ----------------------------------------------- |
| `npm run dev`        | Start the dev server                            |
| `npm run build`      | Generate Prisma client + production build       |
| `npm run start`      | Start the production server                     |
| `npm run test`       | Run the Vitest suite once                       |
| `npm run test:watch` | Run tests in watch mode                         |
| `npm run typecheck`  | `tsc --noEmit`                                   |
| `npm run lint`       | Next.js ESLint                                  |
| `npm run db:push`    | Sync the schema to the database                 |
| `npm run db:seed`    | Seed sample data                                |
| `npm run db:studio`  | Open Prisma Studio                              |

---

## Configuration

All configuration is via environment variables (see [`.env.example`](./.env.example)):

| Variable          | Default          | Purpose                                    |
| ----------------- | ---------------- | ------------------------------------------ |
| `DATABASE_URL`    | `file:./dev.db`  | Prisma datasource URL                      |
| `OPENAI_API_KEY`  | —                | Enables AI resume tailoring                |
| `OPENAI_MODEL`    | `gpt-4o`         | Chat model used for tailoring              |
| `OPENAI_BASE_URL` | —                | Optional override (proxy/Azure gateway)    |
| `LATEX_ENGINE`    | `tectonic`       | `tectonic` \| `pdflatex` \| `xelatex`      |
| `STORAGE_DIR`     | `./storage`      | Where generated `.tex`/`.pdf` are written  |
| `APP_AUTH_TOKEN`  | —                | Optional token enabling single-user auth   |

---

## Deployment

For production, use the included Docker setup with a persistent `/data` volume:

```bash
docker compose --env-file .env.production.local up --build -d
```

The container runs Next.js, applies the Prisma SQLite schema on startup, stores
SQLite plus generated resume artifacts under `/data`, and installs Tectonic for
PDF compilation. See [`docs/deployment.md`](./docs/deployment.md) for required
production environment variables, auth setup, LaTeX behavior, backup guidance,
and the smoke-test checklist.

## Documentation

- [`docs/deployment.md`](./docs/deployment.md) — Docker/Compose production setup,
  environment variables, LaTeX/PDF notes, backups, and smoke tests.
- [`docs/architecture.md`](./docs/architecture.md) — system design, data model,
  and the resume-generation pipeline.
- [`docs/roadmap.md`](./docs/roadmap.md) — milestones and what's next.
- [`CHANGELOG.md`](./CHANGELOG.md) — history of changes.

## Testing

```bash
npm run test
```

Unit tests cover the pure, correctness-critical logic: LaTeX escaping and
template rendering, Zod validation, and the resume-generation pipeline (with a
fake completer, so no API key or network is needed). The UI currently exposes
the dashboard, jobs list, paste-to-prefill job creation, job detail/status management, resume
generation, resume PDF/`.tex` downloads, Settings for editing the active
master resume plus managing LaTeX templates, jobs search/filter/pagination, and
optional single-user auth.
