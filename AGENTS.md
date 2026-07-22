# AGENTS.md

Primary instructions for AI coding agents (Claude Code, Codex, and others)
working in this repository. Human contributors should follow these too.

**Before you start:** read [`docs/HANDOFF.md`](./docs/HANDOFF.md) for the full
project state, then skim [`docs/architecture.md`](./docs/architecture.md) and
[`docs/roadmap.md`](./docs/roadmap.md). This file is the condensed rulebook; the
handoff has the detail.

---

## Project purpose

A personal, single-user **Job Application Assistant** built with Next.js +
TypeScript. It tracks job postings and application status, and generates
**AI-tailored resumes** from one master resume + a LaTeX template (OpenAI API),
compiling them to PDF. Core principle: **the AI reworks only facts already in
the master resume — it must never invent employers, titles, dates, or
credentials.**

Tech stack: Next.js 15 (App Router) · React 19 · TypeScript 5 (strict) ·
Prisma 6 + SQLite · Zod 3 · OpenAI SDK 4 · Tailwind 3 · Vitest 2.

## Preferred coding style

- **TypeScript strict.** No `any` unless unavoidable and commented explaining
  why. `noUncheckedIndexedAccess` is on — handle possibly-undefined indexing.
- **Validate at the boundary with Zod.** Every external input (API bodies, AI
  responses, JSON read from the DB) is parsed with a schema from
  `src/lib/validation.ts`. **Infer** types from schemas (`z.infer`) — never
  maintain a parallel hand-written type.
- **File headers.** Start non-trivial modules with a short docstring explaining
  the file's responsibility, matching the existing style and comment density.
- **Naming/idiom.** Match surrounding code. Prefer small, pure, testable
  functions; isolate side effects.
- **Formatting.** 2-space indent, double quotes, semicolons — as in the existing
  files. Keep `npm run lint` clean.

## Architecture principles

1. **Zod is the single source of truth** for domain shapes. Add new shapes to
   `src/lib/validation.ts`.
2. **Route handlers stay thin:** parse/validate → delegate to a service or
   Prisma → serialize with the helpers in `src/lib/api.ts`. Multi-table or
   multi-step logic goes in `src/lib/services/`.
3. **Depend on interfaces, not vendors.** Domain code uses the `ChatCompleter`
   interface (`src/lib/openai.ts`), not the OpenAI SDK directly, so it stays
   testable without a key or network.
4. **Isolate side effects.** Node-only work (child processes, filesystem) lives
   in clearly server-only modules like `src/lib/resume/pdf.ts`. Never import
   those into client components.
5. **Reads vs. writes.** Server Components may read via Prisma directly. **All
   writes go through the JSON API** so validation and timeline-event logging
   stay in one place.
6. **Graceful degradation.** A missing OpenAI key or LaTeX engine must degrade a
   single feature (with a clear message / warning), never crash the app.

### Do NOT change without a documented reason

- The Zod-as-source-of-truth pattern.
- The **LaTeX escaping sentinel logic** in `src/lib/resume/latex.ts` (protects
  command replacements from the brace-escaping pass; covered by a regression
  test — "handles backslashes without double-escaping").
- The **"persist the generated resume before compiling the PDF"** ordering in
  `src/lib/services/resume-service.ts`.
- The **anti-fabrication `SYSTEM_PROMPT`** intent in
  `src/lib/resume/generator.ts`.

## File organization rules

- Pages & route handlers: `src/app/**` (App Router). Interactive UI → client
  components (`"use client"`); data-loading pages → server components.
- Reusable UI: `src/components/`.
- Domain/services/config: `src/lib/` (`api.ts`, `db.ts`, `env.ts`, `openai.ts`,
  `types.ts`, `validation.ts`, `resume/`, `services/`).
- Env access goes through `src/lib/env.ts` — do not read `process.env` scattered
  around the codebase.
- Tests mirror the unit under test in `tests/`.
- Prisma schema and seed live in `prisma/`.

## Testing expectations

- Add or extend **Vitest** tests for any new **pure logic** (validation,
  rendering, transforms, prompt building). Prefer dependency injection so new
  code is testable without network/filesystem (follow the fake-`ChatCompleter`
  pattern in `tests/generator.test.ts`).
- Tests must not hit the network or require secrets.
- Before committing, run and keep green:
  ```bash
  npm run typecheck && npm run lint && npm run test && npm run build
  ```
- When adding API routes, prefer adding integration tests against a throwaway
  SQLite DB (currently a known gap — see Technical Debt in the handoff).

## Documentation expectations

- Update **`CHANGELOG.md`** and **`docs/roadmap.md`** in the *same commit* as the
  change they describe.
- Keep **`docs/HANDOFF.md`** accurate when the project state materially changes
  (completed features, new WIP, new debt).
- If you change a rule here, update **`AGENTS.md`** so it stays canonical.
- Document non-obvious decisions inline and, if significant, in
  `docs/architecture.md`.

## Git workflow expectations

- **Do not commit automatically when a human asked only for changes/review** —
  wait for explicit instruction unless the task clearly includes committing.
- Work in **small, verifiable increments**; each commit should build and pass
  tests.
- **Never commit secrets.** `.env` is gitignored; only `.env.example` is tracked.
- Do not commit generated artifacts: `node_modules/`, `.next/`, `*.tsbuildinfo`,
  `prisma/*.db`, `storage/` (already in `.gitignore`).
- Commit messages: a concise imperative subject line, then a body explaining
  *what* and *why*. Group a coherent unit of work per commit.
- Confirm the intended target branch with the human before pushing.
