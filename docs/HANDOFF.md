# Project Handoff

> **Purpose of this document.** This is the single most important file for any
> developer or AI agent taking over this project. It captures the full state of
> the repository, what is done, what is not, and how to continue safely. Read it
> end to end before making changes.
>
> **Last updated:** 2026-07-22 · **Branches:** `main` and `work` are aligned
> locally at `fd3bd92` (latest merged baseline known to this environment).
> Continue new work from `main` → recreate `work` to avoid PR conflicts.

---

## Project Overview

### What this application does

The **Job Application Assistant** is a personal, single-user web app for
managing a job search end to end:

- Store and track **job postings**.
- Track each **application's status** through a lifecycle
  (saved → applied → interview → offer → accepted/rejected) with an audit
  **timeline** of events.
- Generate **AI-tailored resumes** from one *master resume* plus a **LaTeX
  template**, using the OpenAI API to rephrase, reorder, and select the most
  relevant content per posting.
- Compile the tailored LaTeX into a **PDF** (via a local LaTeX engine).
- Present a **clean dashboard** summarizing the pipeline.

### The problem it solves

Tailoring a resume for every application is slow and error-prone, and tracking
dozens of applications in a spreadsheet loses history. This app centralizes the
tracking and automates the tailoring while enforcing a hard guardrail: **the AI
may only rework facts already in the master resume — it must never fabricate
employers, titles, dates, or credentials.**

### Current goals

1. Improve the completed app with deployment packaging and production
   operations guidance.
2. Keep the architecture testable, typed, and honest about degradation (missing
   OpenAI key or LaTeX engine should degrade gracefully, never crash).

---

## Current Architecture

### Frameworks and libraries

| Concern            | Choice                                  | Notes |
| ------------------ | --------------------------------------- | ----- |
| Framework          | **Next.js 15.1.4** (App Router)         | React Server Components + route handlers |
| Language           | **TypeScript 5** (strict)               | `noUncheckedIndexedAccess` on |
| UI runtime         | **React 19**                            | |
| Styling            | **Tailwind CSS 3.4**                    | Utility classes + a few `@layer components` helpers in `globals.css` |
| ORM / DB           | **Prisma 6** + **SQLite**               | Swappable to Postgres/MySQL by changing the datasource |
| Validation         | **Zod 3**                               | Single source of truth for shapes; types are inferred |
| AI                 | **openai 4** SDK                        | Behind a `ChatCompleter` interface |
| PDF                | External LaTeX engine (tectonic/pdflatex/xelatex) | Spawned as a child process |
| Tests              | **Vitest 2**                            | Pure-logic unit tests, no network |
| Tooling            | ESLint (`next/core-web-vitals`), `tsx`  | |

### Frontend architecture

- **App Router** under `src/app`. Pages are **React Server Components by
  default** and read data directly through Prisma (`src/lib/db.ts`) for fast,
  simple reads.
- Pages that need fresh data set `export const dynamic = "force-dynamic"` (this
  is a low-traffic personal app; caching is deliberately avoided).
- **Mutations** flow through **client components** that call the JSON API with
  `fetch`. The add-job form, detail status controls, notes editor, and resume
  generation action follow this pattern.
- Shared presentational pieces live in `src/components`, with feature-specific
  client components under `src/components/jobs` and `src/components/settings`.

### Backend architecture

- **Route handlers** in `src/app/api/**/route.ts` are thin: they parse/validate
  input with Zod, delegate to a **service** or Prisma, and serialize JSON.
- **`src/lib/api.ts`** provides the response/error contract: `ok`, `created`,
  `noContent`, `error`, an `HttpError` class, a `parseJson(request, schema)`
  helper, and a `handle()` wrapper that turns thrown errors into consistent JSON
  responses (validation → 400, `HttpError` → its status, OpenAI/PDF
  misconfiguration → 503, everything else → 500).
- **Services** hold business logic that spans multiple tables or steps:
  - `src/lib/services/applications.ts` — status transitions that always record
    an `ApplicationEvent`, and auto-set `appliedAt` the first time status
    becomes `applied`.
  - `src/lib/services/resume-service.ts` — the generation pipeline
    orchestration (load inputs → AI tailor → render LaTeX → optional PDF →
    persist). Persists the generated resume **before** attempting PDF
    compilation so nothing is lost if the PDF step fails.

### Database architecture

SQLite via Prisma (`prisma/schema.prisma`). Models:

| Model              | Purpose                                                        |
| ------------------ | -------------------------------------------------------------- |
| `MasterResume`     | The user's canonical resume, stored as validated JSON in `data`. `isActive` marks the one used for tailoring. |
| `LatexTemplate`    | A LaTeX `body` with `{{placeholders}}`. `isDefault` marks the default. |
| `JobPosting`       | A tracked job (title, company, description, …). 1:1 with `Application`. |
| `Application`      | Status/lifecycle for a posting; `appliedAt`, `nextActionAt`, `notes`. |
| `ApplicationEvent` | Timeline entries (`created`, `status_changed`, `resume_generated`, `note`). |
| `GeneratedResume`  | A tailored resume: `tailoredData` (JSON) + `latexSource` + optional `pdfPath` + `rationale` + `model`. |

Relationships cascade on delete (deleting a `JobPosting` removes its
application, events, and generated resumes). JSON blobs (`MasterResume.data`,
`GeneratedResume.tailoredData`) are re-validated with Zod whenever read.

### AI integration architecture

- `src/lib/openai.ts` defines a **`ChatCompleter` interface** and an
  `OpenAICompleter` implementation. The rest of the code depends on the
  interface, so the generator is unit-tested with a fake completer (no key, no
  network).
- `src/lib/resume/generator.ts` builds the prompts (`SYSTEM_PROMPT`,
  `buildUserPrompt`), calls the completer in **JSON mode**, then
  `parseTailoredResponse` validates the JSON against `tailoredResumeDataSchema`.
- The **anti-fabrication guardrail** lives in `SYSTEM_PROMPT`; the response is
  re-validated against the same schema as the master to keep its shape
  trustworthy.
- Model and key come from env (`OPENAI_MODEL`, `OPENAI_API_KEY`,
  optional `OPENAI_BASE_URL`). Missing key → `OpenAINotConfiguredError` → API
  returns **503** (feature disabled, app still runs).

### External services

- **OpenAI API** — required for tailoring. Configured via env.
- **LaTeX engine** (tectonic / pdflatex / xelatex) — optional system
  dependency, invoked as a subprocess for PDF compilation. If absent, generation
  still works and the `.tex` is downloadable; only the PDF step is skipped.

---

## Current Repository Structure

```
job-application-assistant/
├─ AGENTS.md                  # Primary instructions for AI agents (read first)
├─ README.md                  # Quick start & scripts
├─ CHANGELOG.md               # Per-milestone history
├─ docs/
│  ├─ HANDOFF.md              # This file
│  ├─ architecture.md         # Deeper architecture notes + pipeline diagram
│  └─ roadmap.md              # Milestones and what's next
├─ prisma/
│  ├─ schema.prisma           # Data model (SQLite)
│  └─ seed.ts                 # Idempotent seed: template + sample resume + jobs
├─ src/
│  ├─ app/                    # Next.js App Router
│  │  ├─ layout.tsx           # Root layout + nav
│  │  ├─ globals.css          # Tailwind + component utility classes
│  │  ├─ page.tsx             # Dashboard (server component)
│  │  ├─ jobs/page.tsx        # Jobs list with search/filter/pagination
│  │  ├─ jobs/new/page.tsx    # Add-job page
│  │  ├─ jobs/[id]/page.tsx   # Job/application detail page
│  │  ├─ settings/page.tsx    # Master resume + template settings
│  │  └─ api/                 # Route handlers (REST)
│  │     ├─ jobs/…            # GET/POST, [id] GET/PATCH/DELETE
│  │     ├─ applications/[id] # GET/PATCH (status, notes, timeline)
│  │     ├─ master-resume/…   # GET/PUT
│  │     ├─ templates/…       # GET/POST, [id] PATCH/DELETE
│  │     ├─ resumes/generate  # POST (AI generation)
│  │     ├─ resumes/[id]/pdf  # GET (download PDF)
│  │     ├─ resumes/[id]/tex  # GET (download .tex)
│  │     └─ stats             # GET (dashboard stats)
│  ├─ components/
│  │  ├─ StatusBadge.tsx
│  │  ├─ feedback/ToastProvider.tsx
│  │  ├─ jobs/                # Job form, controls, resume generation action
│  │  └─ settings/            # Master resume + template editors
│  └─ lib/
│     ├─ api.ts               # JSON response + error handling helpers
│     ├─ db.ts                # Prisma client singleton
│     ├─ env.ts               # Validated env access
│     ├─ openai.ts            # ChatCompleter interface + OpenAI impl
│     ├─ types.ts             # Status constants & domain enums
│     ├─ validation.ts        # Zod schemas (source of truth)
│     ├─ resume/
│     │  ├─ defaults.ts       # Default LaTeX template + sample master resume
│     │  ├─ editor-state.ts   # Pure helpers for structured Settings editor
│     │  ├─ generator.ts      # Tailoring pipeline (pure prompt builders + orchestration)
│     │  ├─ latex.ts          # LaTeX escaping + Mustache-style template engine
│     │  └─ pdf.ts            # PDF compilation (spawns LaTeX engine)
│     └─ services/
│        ├─ applications.ts   # Status transitions + timeline events
│        ├─ resume-route-handler.ts # Injectable resume-generation route factory
│        └─ resume-service.ts # Generation orchestration + persistence
├─ tests/                     # Vitest unit + integration tests
│  ├─ api-routes.test.ts      # Route handlers against throwaway SQLite
│  ├─ editor-state.test.ts
│  ├─ generator.test.ts
│  ├─ latex.test.ts
│  ├─ middleware.test.ts
│  └─ validation.test.ts
├─ .env.example               # Documented env template
├─ next.config.ts             # serverExternalPackages for prisma
├─ tailwind.config.ts
├─ tsconfig.json
└─ vitest.config.ts
```

---

## Completed Work

**Milestone 1 — Foundation & core domain (commit `dfcfbd6`)**
- Full scaffolding: Next.js + TS, Tailwind, ESLint, Vitest, npm scripts.
- Prisma schema + SQLite datasource; client singleton; idempotent seed.
- Zod validation schemas as the single source of truth.
- OpenAI wrapper behind `ChatCompleter`.
- LaTeX escaping + dependency-free Mustache-style template engine.
- PDF compilation service with graceful degradation.
- Resume-tailoring generator with anti-fabrication prompt.
- 32 unit tests (escaping, templating, validation, pipeline).

**Milestone 2 — API layer (commit `e428f40`)**
- API helpers (`ok`/`created`/`error`/`HttpError`/`parseJson`/`handle`).
- Application service (status transitions + timeline + `appliedAt`).
- Resume service (AI → LaTeX → optional PDF → persist).
- REST routes: jobs (CRUD), applications (GET/PATCH), master resume (GET/PUT),
  templates (GET/POST, PATCH/DELETE), resume generate, PDF/.tex download, stats.
- Verified end-to-end against the dev server (create/list, status transitions
  with timeline, validation errors, graceful 503 when OpenAI unconfigured).

**Milestone 3 — Dashboard & UI**
- Root layout with navigation + global Tailwind styles + utility classes.
- `StatusBadge` component.
- Dashboard page: summary tiles, pipeline breakdown, recent jobs, recent
  activity (server component via Prisma).
- Jobs list page.
- Add-job page (`/jobs/new`) with a client form posting to `POST /api/jobs`.
- Job detail page (`/jobs/[id]`) showing posting details, application controls,
  notes, timeline, resume generation, and generated-resume downloads.
- Settings page (`/settings`) with a structured master-resume editor and
  LaTeX template management.

---

## Work In Progress

The core app is functionally complete through Settings and Milestone 4
hardening. Jobs, application lifecycle controls, resume generation/downloads,
structured master-resume editing, template management, shared toasts, optional
auth, and route integration tests are all in place.

### Known limitations

- **No PDF engine in this environment:** PDF compilation will throw
  `PdfCompilationError` (caught and surfaced as a non-fatal warning) until a
  LaTeX engine is installed. See *How To Run*.
- **Auth is optional:** leave `APP_AUTH_TOKEN` empty for trusted local use; set
  it before exposing the app beyond a private machine/network.
- **API integration tests cover the core routes and successful generation.**
  Jobs, applications, master resume, templates, resume generation
  misconfiguration/success/PDF-warning paths, resume downloads, and auth
  middleware are covered without network or LaTeX.

---

## Next Recommended Steps

Prioritized for the next developer/agent:

1. **Deployment packaging:** add a Dockerfile/deployment guide with a bundled
   LaTeX engine for reliable PDF export.
2. **Settings UX refinements:** consider reorder controls and richer validation
   affordances on top of the structured editor.
3. **Product expansion:** consider job-posting import, cover-letter generation,
   and analytics once deployment is documented.

Full milestone list lives in [`docs/roadmap.md`](./roadmap.md).

---

## Important Design Decisions

- **Zod schemas are the single source of truth.** All domain types are
  *inferred* from schemas (`z.infer`), so validation and typing cannot drift.
  External inputs (request bodies, AI responses, stored JSON) are always parsed.
- **Services depend on interfaces, not vendors.** The generator takes a
  `ChatCompleter`, not the OpenAI SDK — this is what makes the pipeline testable
  without a key or network.
- **Side effects are isolated.** Node-only concerns (spawning LaTeX, filesystem
  writes) live only in `src/lib/resume/pdf.ts`. Pure logic (escaping,
  templating, prompt building) is separate and heavily tested.
- **Graceful degradation over hard failure.** Missing OpenAI key → 503 for that
  feature. Missing LaTeX engine → generated resume is still saved and `.tex` is
  downloadable; only the PDF is skipped, with a warning.
- **Persist before risky steps.** `resume-service` saves the `GeneratedResume`
  before compiling the PDF, so a compilation failure never loses AI output.
- **Server Components read directly via Prisma; mutations go through the API.**
  Keeps reads simple and fast while centralizing writes/validation.
- **LaTeX escaping uses sentinels.** Characters that map to LaTeX *commands*
  (e.g. `\` → `\textbackslash{}`) are swapped for private-use sentinels first so
  a later brace-escaping pass cannot corrupt them, then restored last. This was
  a real bug caught by a unit test; do not "simplify" it away.
- **SQLite by default** for zero-config local use; the datasource is swappable
  to Postgres/MySQL for production.

---

## Technical Debt

| Item | Impact | Recommended fix |
| ---- | ------ | --------------- |
| `force-dynamic` on all pages | Fine for personal use; would not scale | Introduce caching/revalidation only if multi-user |
| `openai`/`next`/`zod` etc. have newer majors available | None today (pinned & working) | Upgrade deliberately, one major at a time, re-running tests/build |
| PDF engine not bundled | PDF disabled unless engine installed | Document install; consider a Docker image with tectonic for deploy |

---

## How To Run The Project

### Prerequisites
- **Node.js 22** (verified with v22.22.2) and npm 10.
- *(Optional, for PDF)* a LaTeX engine — **tectonic** recommended.

### Installation

```bash
npm install
cp .env.example .env      # then edit .env (see below)
npm run db:push           # create the SQLite schema
npm run db:seed           # sample master resume, default template, example jobs
```

### Environment variables (`.env`)

| Variable          | Required | Default         | Purpose |
| ----------------- | -------- | --------------- | ------- |
| `DATABASE_URL`    | yes      | `file:./dev.db` | Prisma datasource |
| `OPENAI_API_KEY`  | for AI   | —               | Enables resume tailoring; without it, generation returns 503 |
| `OPENAI_MODEL`    | no       | `gpt-4o`        | Chat model |
| `OPENAI_BASE_URL` | no       | —               | Proxy/Azure gateway override |
| `LATEX_ENGINE`    | no       | `tectonic`      | `tectonic` \| `pdflatex` \| `xelatex` |
| `STORAGE_DIR`     | no       | `./storage`     | Where generated `.tex`/`.pdf` are written |
| `APP_AUTH_TOKEN`  | no       | —               | Optional single-user auth token |

> The committed `.env` in this environment has a **placeholder** `OPENAI_API_KEY`
> (`"sk-..."`) — replace it with a real key to exercise AI generation. `.env` is
> gitignored.

### Development

```bash
npm run dev          # http://localhost:3000
npm run db:studio    # inspect the database in Prisma Studio
```

### Build

```bash
npm run build        # runs `prisma generate` then `next build`
npm run start        # serve the production build
```

### Testing / quality

```bash
npm run test         # Vitest (51 tests at latest local run)
npm run typecheck    # tsc --noEmit
npm run lint         # next lint
```

---

## Git / branch handoff note

The GitHub default branch is now `main`. In this environment, local `main` and
`work` were aligned at `fd3bd92` to avoid repeatedly opening PRs from stale
history. For the next chat/session, start by syncing from GitHub if credentials
are available:

```bash
git fetch origin main
git checkout main
git reset --hard origin/main
git checkout -B work main
```

If GitHub credentials are unavailable in the container, ask the human to merge or
sync externally, then ensure `git diff main..work` is empty before starting new
work. This prevents conflicts caused by stacking new changes on an already
merged PR branch.

## AI Agent Instructions

> The root **`AGENTS.md`** is the canonical, condensed rulebook. This section
> expands on it with handoff-specific context. If the two ever disagree,
> `AGENTS.md` wins and should be updated.

- **Coding conventions**
  - TypeScript strict mode; no `any` unless truly unavoidable and commented.
  - Validate every external input with a Zod schema from `src/lib/validation.ts`;
    add new shapes there and infer the type — never hand-write a parallel type.
  - Keep route handlers thin: parse → delegate to a service/Prisma → serialize.
    Business logic spanning tables/steps belongs in `src/lib/services`.
  - Match the existing comment density and file-header docstring style.
- **Architecture rules**
  - Depend on the `ChatCompleter` interface, not the OpenAI SDK, in domain code.
  - Keep Node-only side effects (child processes, fs) inside `src/lib/resume/pdf.ts`
    or clearly server-only modules; never import them into client components.
  - Server Components may read via Prisma directly; **all writes go through the
    JSON API** so validation and event-logging stay centralized.
  - Preserve graceful degradation: never let a missing key/engine crash the app.
- **Things NOT to change** (without a very good, documented reason)
  - The Zod-as-source-of-truth pattern.
  - The LaTeX escaping sentinel logic in `src/lib/resume/latex.ts` (see the test
    `handles backslashes without double-escaping`).
  - The "persist generated resume before PDF compilation" ordering in
    `resume-service.ts`.
  - The anti-fabrication `SYSTEM_PROMPT` intent in `generator.ts`.
- **Preferred approaches**
  - Work in small, verifiable increments; run `typecheck` + `test` + `build`
    before committing.
  - Update `CHANGELOG.md` and `docs/roadmap.md` in the same commit as the change.
  - Add/extend tests for any new pure logic; prefer dependency injection to make
    new code testable without network/filesystem.

---

## Project Health At Handoff

All checks run on 2026-07-22, Node v22.22.2:

| Check                         | Result |
| ----------------------------- | ------ |
| `npm install` / dependency tree | ✅ resolves (one harmless extraneous transitive `@emnapi/runtime`) |
| `npm run typecheck`           | ✅ pass (0 errors) |
| `npm run lint`                | ✅ pass (0 warnings/errors) |
| `npm run test`                | ✅ 51/51 pass |
| `npm run build`               | ✅ success — app routes + middleware compiled |
| Git working tree              | ✅ clean locally; remote push/fetch requires credentials/network outside this environment |
| LaTeX engine present          | ⚠️ none installed here (PDF degrades gracefully by design) |
| OpenAI key                    | ⚠️ placeholder in `.env` (replace to use AI) |

No failing checks. The two ⚠️ items are environment configuration, not code
defects.
