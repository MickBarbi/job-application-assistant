import Link from "next/link";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/StatusBadge";
import {
  APPLICATION_STATUSES,
  ACTIVE_STATUSES,
  STATUS_LABELS,
  type ApplicationStatus,
} from "@/lib/types";

// Always render fresh data (this is a personal, low-traffic dashboard).
export const dynamic = "force-dynamic";

async function getDashboardData() {
  const [grouped, total, resumesGenerated, recentJobs, recentEvents] =
    await Promise.all([
      prisma.application.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.jobPosting.count(),
      prisma.generatedResume.count(),
      prisma.jobPosting.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { application: { select: { id: true, status: true } } },
      }),
      prisma.applicationEvent.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        include: {
          application: {
            include: { jobPosting: { select: { title: true, company: true } } },
          },
        },
      }),
    ]);

  const byStatus = Object.fromEntries(
    APPLICATION_STATUSES.map((s) => [s, 0])
  ) as Record<ApplicationStatus, number>;
  for (const row of grouped) {
    byStatus[row.status as ApplicationStatus] = row._count._all;
  }
  const active = ACTIVE_STATUSES.reduce((a, s) => a + byStatus[s], 0);

  return { byStatus, total, active, resumesGenerated, recentJobs, recentEvents };
}

export default async function DashboardPage() {
  const { byStatus, total, active, resumesGenerated, recentJobs, recentEvents } =
    await getDashboardData();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-slate-500">Your job search at a glance.</p>
        </div>
        <Link href="/jobs/new" className="btn-primary">
          + Add job
        </Link>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Total jobs" value={total} />
        <Stat label="Active" value={active} />
        <Stat label="Interviews" value={byStatus.interview} />
        <Stat label="Resumes generated" value={resumesGenerated} />
      </div>

      {/* Pipeline */}
      <section className="card p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Pipeline
        </h2>
        <div className="flex flex-wrap gap-3">
          {APPLICATION_STATUSES.map((s) => (
            <div
              key={s}
              className="flex min-w-[110px] flex-1 flex-col items-center rounded-lg border border-slate-200 p-3"
            >
              <span className="text-2xl font-bold">{byStatus[s]}</span>
              <span className="mt-1 text-xs text-slate-500">
                {STATUS_LABELS[s]}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent jobs */}
        <section className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Recent jobs
            </h2>
            <Link href="/jobs" className="text-sm text-slate-500 hover:underline">
              View all →
            </Link>
          </div>
          {recentJobs.length === 0 ? (
            <EmptyState message="No jobs yet. Add your first posting." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentJobs.map((job) => (
                <li key={job.id} className="flex items-center justify-between py-2.5">
                  <Link
                    href={`/jobs/${job.id}`}
                    className="min-w-0 flex-1 hover:underline"
                  >
                    <span className="block truncate font-medium">{job.title}</span>
                    <span className="block truncate text-sm text-slate-500">
                      {job.company}
                    </span>
                  </Link>
                  {job.application && <StatusBadge status={job.application.status} />}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recent activity */}
        <section className="card p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Recent activity
          </h2>
          {recentEvents.length === 0 ? (
            <EmptyState message="Activity will appear here." />
          ) : (
            <ul className="space-y-3">
              {recentEvents.map((e) => (
                <li key={e.id} className="flex gap-3 text-sm">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-slate-300" />
                  <div className="min-w-0">
                    <p className="text-slate-700">{e.message}</p>
                    <p className="text-xs text-slate-400">
                      {e.application.jobPosting.title} ·{" "}
                      {e.application.jobPosting.company} ·{" "}
                      {new Date(e.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-5">
      <div className="text-3xl font-bold">{value}</div>
      <div className="mt-1 text-sm text-slate-500">{label}</div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="py-6 text-center text-sm text-slate-400">{message}</p>;
}
