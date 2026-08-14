import Link from "next/link";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/StatusBadge";
import {
  APPLICATION_STATUSES,
  ACTIVE_STATUSES,
  STATUS_LABELS,
  type ApplicationStatus,
  type ApplicationEventType,
} from "@/lib/types";

// Always render fresh data (this is a personal, low-traffic dashboard).
export const dynamic = "force-dynamic";

async function getDashboardData() {
  const [
    grouped,
    total,
    resumesGenerated,
    coverLettersGenerated,
    recentJobs,
    recentEvents,
  ] = await Promise.all([
    prisma.application.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.jobPosting.count(),
    prisma.generatedResume.count(),
    prisma.generatedCoverLetter.count(),
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

  return {
    byStatus,
    total,
    active,
    resumesGenerated,
    coverLettersGenerated,
    recentJobs,
    recentEvents,
  };
}

export default async function DashboardPage() {
  const {
    byStatus,
    total,
    active,
    resumesGenerated,
    coverLettersGenerated,
    recentJobs,
    recentEvents,
  } = await getDashboardData();

  const pipelineTotal = APPLICATION_STATUSES.reduce(
    (a, s) => a + byStatus[s],
    0
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-500">Your job search at a glance.</p>
        </div>
        <Link href="/jobs/new" className="btn-primary">
          + Add job
        </Link>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Total jobs" value={total} accent="slate" icon={<BriefcaseIcon />} />
        <Stat label="Active" value={active} accent="blue" icon={<PulseIcon />} />
        <Stat label="Interviews" value={byStatus.interview} accent="violet" icon={<ChatIcon />} />
        <Stat label="Offers" value={byStatus.offer} accent="emerald" icon={<StarIcon />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Pipeline */}
        <section className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Pipeline
            </h2>
            <span className="text-xs text-slate-400">
              {pipelineTotal} {pipelineTotal === 1 ? "application" : "applications"}
            </span>
          </div>
          {pipelineTotal === 0 ? (
            <EmptyState message="No applications yet. Add your first posting." />
          ) : (
            <>
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
                {APPLICATION_STATUSES.filter((s) => byStatus[s] > 0).map((s) => (
                  <div
                    key={s}
                    className={`h-full ${STATUS_BAR[s]} first:rounded-l-full last:rounded-r-full`}
                    style={{ width: `${(byStatus[s] / pipelineTotal) * 100}%` }}
                    title={`${STATUS_LABELS[s]}: ${byStatus[s]}`}
                  />
                ))}
              </div>
              <ul className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
                {APPLICATION_STATUSES.map((s) => (
                  <li key={s} className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_BAR[s]}`} />
                    <span className="text-sm text-slate-600">{STATUS_LABELS[s]}</span>
                    <span className="ml-auto text-sm font-semibold tabular-nums text-slate-900">
                      {byStatus[s]}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        {/* Generated documents */}
        <section className="card p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Documents generated
          </h2>
          <div className="space-y-3">
            <DocStat
              label="Tailored resumes"
              value={resumesGenerated}
              accent="emerald"
              icon={<DocumentIcon />}
            />
            <DocStat
              label="Cover letters"
              value={coverLettersGenerated}
              accent="violet"
              icon={<EnvelopeIcon />}
            />
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent jobs */}
        <section className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Recent jobs
            </h2>
            <Link href="/jobs" className="text-sm text-slate-500 hover:text-slate-900 hover:underline">
              View all →
            </Link>
          </div>
          {recentJobs.length === 0 ? (
            <EmptyState message="No jobs yet. Add your first posting." />
          ) : (
            <ul className="-mx-2">
              {recentJobs.map((job) => (
                <li key={job.id}>
                  <Link
                    href={`/jobs/${job.id}`}
                    className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-slate-50"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-500">
                      {initials(job.company)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{job.title}</span>
                      <span className="block truncate text-sm text-slate-500">
                        {job.company}
                      </span>
                    </span>
                    {job.application && <StatusBadge status={job.application.status} />}
                  </Link>
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
            <ol className="relative space-y-4 border-l border-slate-200 pl-5">
              {recentEvents.map((e) => (
                <li key={e.id} className="relative text-sm">
                  <span
                    className={`absolute -left-[1.4rem] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-white ${EVENT_DOT[e.type as ApplicationEventType] ?? "bg-slate-300"}`}
                  />
                  <p className="text-slate-700">{e.message}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {e.application.jobPosting.title} · {e.application.jobPosting.company} ·{" "}
                    {new Date(e.createdAt).toLocaleDateString()}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Presentation helpers                                                       */
/* -------------------------------------------------------------------------- */

type Accent = "slate" | "blue" | "violet" | "emerald";

const ACCENT_CHIP: Record<Accent, string> = {
  slate: "bg-slate-100 text-slate-600",
  blue: "bg-blue-50 text-blue-600",
  violet: "bg-violet-50 text-violet-600",
  emerald: "bg-emerald-50 text-emerald-600",
};

const ACCENT_BAR: Record<Accent, string> = {
  slate: "bg-slate-300",
  blue: "bg-blue-500",
  violet: "bg-violet-500",
  emerald: "bg-emerald-500",
};

/** Solid status colors for the pipeline bar and legend dots. */
const STATUS_BAR: Record<ApplicationStatus, string> = {
  saved: "bg-slate-400",
  applied: "bg-blue-500",
  interview: "bg-violet-500",
  offer: "bg-green-500",
  accepted: "bg-emerald-500",
  rejected: "bg-red-500",
};

/** Timeline dot colors keyed by event type. */
const EVENT_DOT: Record<ApplicationEventType, string> = {
  created: "bg-slate-300",
  status_changed: "bg-blue-500",
  resume_generated: "bg-emerald-500",
  cover_letter_generated: "bg-violet-500",
  note: "bg-amber-400",
};

function Stat({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: number;
  accent: Accent;
  icon: React.ReactNode;
}) {
  return (
    <div className="card relative overflow-hidden p-5">
      <div className={`absolute inset-x-0 top-0 h-1 ${ACCENT_BAR[accent]}`} />
      <div className="flex items-start justify-between">
        <div>
          <div className="text-3xl font-bold tracking-tight tabular-nums">{value}</div>
          <div className="mt-1 text-sm text-slate-500">{label}</div>
        </div>
        <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${ACCENT_CHIP[accent]}`}>
          {icon}
        </span>
      </div>
    </div>
  );
}

function DocStat({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: number;
  accent: Accent;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
      <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${ACCENT_CHIP[accent]}`}>
        {icon}
      </span>
      <span className="text-sm text-slate-600">{label}</span>
      <span className="ml-auto text-xl font-bold tabular-nums text-slate-900">{value}</span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="py-6 text-center text-sm text-slate-400">{message}</p>;
}

function initials(company: string): string {
  const words = company.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return (words[0]![0]! + words[1]![0]!).toUpperCase();
}

/* -------------------------------------------------------------------------- */
/* Icons (inline SVG, no dependency)                                          */
/* -------------------------------------------------------------------------- */

const ICON_PROPS = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function BriefcaseIcon() {
  return (
    <svg {...ICON_PROPS} aria-hidden="true">
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M3 12h18" />
    </svg>
  );
}

function PulseIcon() {
  return (
    <svg {...ICON_PROPS} aria-hidden="true">
      <path d="M3 12h4l2 6 4-12 2 6h6" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg {...ICON_PROPS} aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg {...ICON_PROPS} aria-hidden="true">
      <path d="M12 3l2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.8L6.6 19.6l1-6L3.3 9.4l6-.9z" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg {...ICON_PROPS} aria-hidden="true">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h6" />
    </svg>
  );
}

function EnvelopeIcon() {
  return (
    <svg {...ICON_PROPS} aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  );
}
