import Link from "next/link";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const jobs = await prisma.jobPosting.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      application: { select: { id: true, status: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Jobs</h1>
          <p className="text-sm text-slate-500">
            {jobs.length} {jobs.length === 1 ? "posting" : "postings"} tracked.
          </p>
        </div>
        <Link href="/jobs/new" className="btn-primary">
          + Add job
        </Link>
      </div>

      {jobs.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-slate-500">No jobs yet.</p>
          <Link href="/jobs/new" className="btn-primary mt-4">
            Add your first job
          </Link>
        </div>
      ) : (
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
      )}
    </div>
  );
}
