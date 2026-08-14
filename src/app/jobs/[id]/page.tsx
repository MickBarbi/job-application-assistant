import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/StatusBadge";
import { ApplicationControls } from "@/components/jobs/ApplicationControls";
import { ApplicationKit } from "@/components/jobs/ApplicationKit";
import { ResumeGenerator } from "@/components/jobs/ResumeGenerator";
import { CoverLetterGenerator } from "@/components/jobs/CoverLetterGenerator";
import { CopyButton } from "@/components/CopyButton";
import {
  isApplicationStatus,
  COVER_LETTER_TONE_LABELS,
  isCoverLetterTone,
  type ApplicationStatus,
} from "@/lib/types";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export default async function JobDetailPage({ params }: Params) {
  const { id } = await params;
  const job = await prisma.jobPosting.findUnique({
    where: { id },
    include: {
      application: {
        include: {
          events: { orderBy: { createdAt: "desc" } },
          generatedResumes: {
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              rationale: true,
              model: true,
              pdfPath: true,
              createdAt: true,
            },
          },
          generatedCoverLetters: {
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              body: true,
              rationale: true,
              tone: true,
              model: true,
              createdAt: true,
            },
          },
        },
      },
    },
  });

  if (!job || !job.application || !isApplicationStatus(job.application.status)) {
    notFound();
  }

  const status: ApplicationStatus = job.application.status;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/jobs" className="text-sm text-slate-500 hover:underline">
            ← Back to jobs
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">{job.title}</h1>
            <StatusBadge status={status} />
          </div>
          <p className="mt-1 text-slate-600">
            {job.company}
            {job.location ? ` · ${job.location}` : ""}
          </p>
        </div>
        {job.url && (
          <a href={job.url} className="btn-secondary" target="_blank" rel="noreferrer">
            View posting ↗
          </a>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <main className="space-y-6">
          <section className="card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Posting details
            </h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <Detail label="Source" value={job.source} />
              <Detail label="Salary" value={job.salaryRange} />
              <Detail label="Saved" value={formatDate(job.createdAt)} />
              <Detail label="Applied" value={job.application.appliedAt ? formatDate(job.application.appliedAt) : ""} />
            </dl>
            {job.description && (
              <div className="mt-5">
                <h3 className="label">Description</h3>
                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {job.description}
                </p>
              </div>
            )}
          </section>

          <section className="card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Generated resumes
            </h2>
            {job.application.generatedResumes.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">
                No tailored resumes yet. Generate one from the sidebar.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-slate-100">
                {job.application.generatedResumes.map((resume) => (
                  <li key={resume.id} className="space-y-3 py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium">{formatDateTime(resume.createdAt)}</p>
                        <p className="text-xs text-slate-500">Model: {resume.model}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {resume.pdfPath && (
                          <a className="btn-secondary" href={`/api/resumes/${resume.id}/pdf`}>
                            PDF
                          </a>
                        )}
                        <a className="btn-secondary" href={`/api/resumes/${resume.id}/tex`}>
                          .tex
                        </a>
                      </div>
                    </div>
                    {resume.rationale && (
                      <p className="text-sm leading-6 text-slate-600">{resume.rationale}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Cover letters
            </h2>
            {job.application.generatedCoverLetters.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">
                No cover letters yet. Draft one from the sidebar.
              </p>
            ) : (
              <ul className="mt-4 space-y-4">
                {job.application.generatedCoverLetters.map((letter) => (
                  <li key={letter.id} className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
                          {isCoverLetterTone(letter.tone)
                            ? COVER_LETTER_TONE_LABELS[letter.tone]
                            : letter.tone}
                        </span>
                        <p className="text-sm font-medium">{formatDateTime(letter.createdAt)}</p>
                        <p className="text-xs text-slate-500">· {letter.model}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <CopyButton value={letter.body} label="Copy text" className="btn-secondary text-xs" />
                        <a className="btn-secondary text-xs" href={`/api/cover-letters/${letter.id}/txt`}>
                          .txt
                        </a>
                      </div>
                    </div>
                    <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap border-l-2 border-slate-300 bg-white p-3 font-sans text-sm leading-6 text-slate-700">
                      {letter.body}
                    </pre>
                    {letter.rationale && (
                      <p className="mt-2 text-xs italic text-slate-500">{letter.rationale}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Timeline
            </h2>
            {job.application.events.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">No activity yet.</p>
            ) : (
              <ol className="mt-4 space-y-4">
                {job.application.events.map((event) => (
                  <li key={event.id} className="flex gap-3 text-sm">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-slate-300" />
                    <div>
                      <p className="text-slate-700">{event.message}</p>
                      <p className="text-xs text-slate-400">
                        {formatDateTime(event.createdAt)} · {event.type}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </main>

        <aside className="space-y-6">
          <ApplicationKit
            input={{
              title: job.title,
              company: job.company,
              location: job.location,
              url: job.url,
              status,
              hasGeneratedResume: job.application.generatedResumes.length > 0,
            }}
          />
          <ApplicationControls
            applicationId={job.application.id}
            initialStatus={status}
            initialNotes={job.application.notes}
          />
          <ResumeGenerator applicationId={job.application.id} />
          <CoverLetterGenerator applicationId={job.application.id} />
          {job.notes && (
            <section className="card p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Job notes
              </h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {job.notes}
              </p>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-slate-700">{value || "—"}</dd>
    </div>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(date);
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
