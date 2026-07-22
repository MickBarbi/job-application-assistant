import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/StatusBadge";
import {
  APPLICATION_STATUSES,
  STATUS_LABELS,
  isApplicationStatus,
  type ApplicationStatus,
} from "@/lib/types";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

type JobsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function JobsPage({ searchParams }: JobsPageProps) {
  const params = await searchParams;
  const query = readParam(params.q).trim();
  const statusParam = readParam(params.status);
  const status = isApplicationStatus(statusParam) ? statusParam : "";
  const page = parsePage(readParam(params.page));

  const where = buildWhere(query, status);
  const [jobs, total] = await Promise.all([
    prisma.jobPosting.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        application: { select: { id: true, status: true } },
      },
    }),
    prisma.jobPosting.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Jobs</h1>
          <p className="text-sm text-slate-500">
            {total} {total === 1 ? "posting" : "postings"} matched.
          </p>
        </div>
        <Link href="/jobs/new" className="btn-primary">
          + Add job
        </Link>
      </div>

      <form className="card grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_220px_auto]" action="/jobs">
        <label>
          <span className="label">Search</span>
          <input
            className="input"
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Title, company, location, source…"
          />
        </label>
        <label>
          <span className="label">Status</span>
          <select className="input" name="status" defaultValue={status}>
            <option value="">All statuses</option>
            {APPLICATION_STATUSES.map((item) => (
              <option key={item} value={item}>
                {STATUS_LABELS[item]}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button type="submit" className="btn-primary">
            Filter
          </button>
          {(query || status) && (
            <Link href="/jobs" className="btn-secondary">
              Clear
            </Link>
          )}
        </div>
      </form>

      {jobs.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-slate-500">
            {query || status ? "No jobs match those filters." : "No jobs yet."}
          </p>
          <Link href="/jobs/new" className="btn-primary mt-4">
            Add your first job
          </Link>
        </div>
      ) : (
        <>
          <div className="card divide-y divide-slate-100">
            {jobs.map((job) => (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="flex items-center justify-between gap-4 p-4 hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{job.title}</p>
                  <p className="truncate text-sm text-slate-500">
                    {job.company}
                    {job.location ? ` · ${job.location}` : ""}
                    {job.salaryRange ? ` · ${job.salaryRange}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {job.application && <StatusBadge status={job.application.status} />}
                  <span className="text-xs text-slate-400">
                    {new Date(job.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            query={query}
            status={status}
          />
        </>
      )}
    </div>
  );
}

function readParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function parsePage(value: string): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function buildWhere(query: string, status: ApplicationStatus | ""): Prisma.JobPostingWhereInput {
  const where: Prisma.JobPostingWhereInput = {};
  if (query) {
    where.OR = [
      { title: { contains: query } },
      { company: { contains: query } },
      { location: { contains: query } },
      { source: { contains: query } },
      { description: { contains: query } },
    ];
  }
  if (status) {
    where.application = { is: { status } };
  }
  return where;
}

function Pagination({
  page,
  totalPages,
  query,
  status,
}: {
  page: number;
  totalPages: number;
  query: string;
  status: ApplicationStatus | "";
}) {
  if (totalPages <= 1) return null;

  return (
    <nav className="flex items-center justify-between text-sm text-slate-500">
      <span>
        Page {page} of {totalPages}
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <Link className="btn-secondary" href={pageHref(page - 1, query, status)}>
            ← Previous
          </Link>
        )}
        {page < totalPages && (
          <Link className="btn-secondary" href={pageHref(page + 1, query, status)}>
            Next →
          </Link>
        )}
      </div>
    </nav>
  );
}

function pageHref(page: number, query: string, status: ApplicationStatus | "") {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (status) params.set("status", status);
  if (page > 1) params.set("page", String(page));
  const suffix = params.toString();
  return suffix ? `/jobs?${suffix}` : "/jobs";
}
