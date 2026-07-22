# Architecture

## Overview

The Job Application Assistant is a single Next.js (App Router) application with
three layers:

```
┌────────────────────────────────────────────────────────────┐
│  UI (React Server + Client Components under src/app)         │
│   dashboard · jobs · applications · settings                 │
└───────────────┬──────────────────────────────────────────────┘
                │ fetch()
┌───────────────▼──────────────────────────────────────────────┐
│  API routes (src/app/api/**/route.ts)                         │
│   validate (zod) → call services → serialise JSON             │
└───────────────┬──────────────────────────────────────────────┘
                │
┌───────────────▼──────────────────────────────────────────────┐
│  Domain services (src/lib)                                    │
│   db (Prisma) · openai · resume/{generator,latex,pdf}         │
└───────────────┬──────────────────────────────────────────────┘
                │
        ┌───────▼────────┐   ┌──────────────┐   ┌──────────────┐
        │ SQLite (Prisma)│   │  OpenAI API  │   │ LaTeX engine │
        └────────────────┘   └──────────────┘   └──────────────┘
```

### Design principles

- **Validation at the boundary.** Every external input (API request bodies, AI
  responses) is parsed with a Zod schema before it reaches domain logic. Types
  are *inferred* from those schemas, so validation and typing never drift.
- **Services depend on interfaces, not vendors.** The resume generator depends
  on a `ChatCompleter` interface, not the OpenAI SDK, which makes it fully
  unit-testable without a network or API key.
- **Side effects are isolated.** Node-only concerns (spawning a LaTeX process,
  writing files) live only in `src/lib/resume/pdf.ts`. Pure logic (escaping,
  templating, prompt building) is separate and heavily tested.
- **Graceful degradation.** Missing OpenAI key or LaTeX engine degrades a
  feature with a clear message rather than crashing the app.

## Data model

Defined in [`prisma/schema.prisma`](../prisma/schema.prisma).

| Model              | Purpose                                                      |
| ------------------ | ------------------------------------------------------------ |
| `MasterResume`     | The user's canonical resume, stored as validated JSON.       |
| `LatexTemplate`    | A LaTeX body with `{{placeholders}}` for rendering.          |
| `JobPosting`       | A tracked job (title, company, description, …).              |
| `Application`      | Lifecycle/status for a posting (1:1 with `JobPosting`).      |
| `ApplicationEvent` | Timeline entries (status changes, notes, generation events). |
| `GeneratedResume`  | A tailored resume: JSON + rendered LaTeX + optional PDF path. |

Application statuses (`src/lib/types.ts`): `saved`, `applied`, `interview`,
`offer`, `accepted`, `rejected`.

## Resume generation pipeline

Implemented in [`src/lib/resume/generator.ts`](../src/lib/resume/generator.ts).

```
master resume (JSON) +
job posting          +--> buildUserPrompt --> ChatCompleter.complete (JSON mode)
LaTeX template       +                              |
                                                    v
                          parseTailoredResponse (JSON + Zod validation)
                                                    |
                                                    v
                          renderResumeLatex (Mustache-style + LaTeX escaping)
                                                    |
                                                    v
                          compileLatexToPdf (optional; external engine)
```

**Anti-fabrication guardrail.** The system prompt forbids inventing employers,
titles, dates, or credentials — the AI may only rephrase, reorder, and select
from the master resume. The response is re-validated against the same schema as
the master to keep its shape trustworthy.

### LaTeX escaping & templating

`src/lib/resume/latex.ts` contains a dependency-free renderer:

- `escapeLatex` escapes `& % $ # _ { } ~ ^ \` and normalises common Unicode
  punctuation. Characters that map to LaTeX *commands* (e.g. `\` →
  `\textbackslash{}`) are protected with private-use sentinels so a later
  brace-escaping pass cannot corrupt them.
- `renderTemplate` supports `{{var}}` (escaped), `{{{var}}}` (raw), array/loop
  sections `{{#list}}…{{/list}}`, conditionals, and inverted sections
  `{{^flag}}…{{/flag}}`. Unknown variables render as empty strings so a slightly
  off template never crashes compilation.

### PDF compilation

`src/lib/resume/pdf.ts` shells out to the configured engine in an isolated temp
working directory, then copies the resulting PDF into `STORAGE_DIR/resumes/`.
Engine availability is probed once and memoised; if unavailable, a
`PdfCompilationError` is thrown and callers fall back to offering the `.tex`.

## Deployment architecture

The default production packaging is a single Docker container orchestrated by
`compose.yaml`. The image builds the Next.js app with Node.js 22, installs
Tectonic in the runtime layer, and serves with `next start`. Runtime state lives
under the persistent `/data` volume: `DATABASE_URL=file:/data/app.db` for SQLite
and `STORAGE_DIR=/data/storage` for generated LaTeX/PDF artifacts. The entrypoint
runs `prisma db push --skip-generate` before startup so a fresh volume receives
the current schema. See `docs/deployment.md` for operator steps and smoke tests.

## Testing strategy

- **Pure logic is unit-tested** (Vitest): escaping, templating, validation, and
  the generation pipeline with a fake `ChatCompleter`.
- **No network in tests.** The OpenAI dependency is injected, so tests are fast
  and deterministic.
- Integration of the API routes with the database is exercised manually and via
  the seed script; see the roadmap for planned automated coverage.
