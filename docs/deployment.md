# Deployment Guide

This app is designed for a small, single-user deployment. The default production
path is a Docker container that runs Next.js, Prisma, SQLite, and a local LaTeX
engine with one persistent data volume.

## Container layout

The included `Dockerfile` builds the Next.js app with Node.js 22 and installs
Tectonic in the runtime image for PDF generation. The runtime container uses:

- `DATABASE_URL=file:/data/app.db` for the SQLite database.
- `STORAGE_DIR=/data/storage` for generated `.tex` and `.pdf` files.
- A `/data` Docker volume so the database and generated resumes survive
  container replacement.

At startup, `docker-entrypoint.sh` creates the storage directory and runs
`prisma db push --skip-generate` so a fresh SQLite volume has the expected
schema before `next start` begins serving traffic.

## Required production environment

| Variable | Required? | Recommended production value | Notes |
| --- | --- | --- | --- |
| `DATABASE_URL` | yes | `file:/data/app.db` | Keep this inside the persistent `/data` volume for SQLite. |
| `STORAGE_DIR` | yes | `/data/storage` | Stores generated `.tex` and `.pdf` artifacts. |
| `OPENAI_API_KEY` | for AI | real OpenAI API key | Leave unset only when intentionally testing degraded generation. |
| `OPENAI_MODEL` | no | `gpt-4o` | Override for cost/quality tradeoffs. |
| `OPENAI_BASE_URL` | no | unset | Use only for a compatible proxy or gateway. |
| `LATEX_ENGINE` | no | `tectonic` | The Docker image installs Tectonic by default. |
| `APP_AUTH_TOKEN` | strongly recommended | long random token | When set, all app/API routes require bearer or Basic auth. |

Generate an auth token with a password manager or a command such as
`openssl rand -base64 32`. Do not commit real tokens or API keys.

## Docker Compose quick start

1. Create a local env file for Compose (do not commit it):

   ```bash
   cp .env.example .env.production.local
   $EDITOR .env.production.local
   ```

2. Start the app with the env file:

   ```bash
   docker compose --env-file .env.production.local up --build -d
   ```

3. Open `http://localhost:3000`. If `APP_AUTH_TOKEN` is set, sign in with either:

   - `Authorization: Bearer <token>` for API clients; or
   - browser Basic auth using any username and the token as the password.

4. Seed an empty production volume only if you want sample data:

   ```bash
   docker compose --env-file .env.production.local exec app npm run db:seed
   ```

## LaTeX/PDF behavior

Tectonic is the preferred deployment engine because it is self-contained and is
installed by the Dockerfile. If PDF compilation fails or an engine is missing,
resume generation should still persist the generated resume and expose the raw
`.tex` download; only the PDF link is unavailable.

For non-Docker hosts, install one supported engine and set `LATEX_ENGINE`:

- `tectonic` (recommended)
- `pdflatex` from TeX Live/MiKTeX
- `xelatex` from TeX Live/MiKTeX

## Smoke-test checklist

Run this checklist after every first deploy, image rebuild, or env change:

1. Start from a clean container and confirm the app loads at `/`.
2. If `APP_AUTH_TOKEN` is set, verify unauthenticated `/jobs` requests are
   rejected and Basic auth with the token succeeds.
3. Run `npm run db:seed` when you want sample data, then confirm seeded jobs
   appear on `/jobs`.
4. Create a new job from `/jobs/new` and confirm it redirects to the detail page.
5. Change an application status and confirm the timeline records the event.
6. Save Settings changes for the active master resume and a LaTeX template.
7. With a valid `OPENAI_API_KEY`, generate a tailored resume from a job detail
   page and confirm the generated resume appears in history.
8. Confirm the `.tex` download works for the generated resume.
9. Confirm PDF behavior:
   - With Tectonic installed, the PDF link downloads a PDF.
   - Without a working engine, the UI reports a non-fatal PDF warning and the
     generated `.tex` remains downloadable.
10. Restart the container and confirm jobs plus generated artifacts persist.

## Backups and upgrades

Back up the `/data` volume before upgrading. For the default SQLite deployment,
that means preserving both `/data/app.db` and `/data/storage`. Rebuild and
restart with:

```bash
docker compose --env-file .env.production.local up --build -d
```
