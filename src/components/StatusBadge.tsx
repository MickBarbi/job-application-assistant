import { STATUS_LABELS, type ApplicationStatus } from "@/lib/types";

const STYLES: Record<ApplicationStatus, string> = {
  saved: "bg-slate-100 text-slate-700 ring-slate-200",
  applied: "bg-blue-50 text-blue-700 ring-blue-200",
  interview: "bg-violet-50 text-violet-700 ring-violet-200",
  offer: "bg-green-50 text-green-700 ring-green-200",
  accepted: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  rejected: "bg-red-50 text-red-700 ring-red-200",
};

export function StatusBadge({ status }: { status: string }) {
  const key = (status as ApplicationStatus) in STYLES
    ? (status as ApplicationStatus)
    : "saved";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STYLES[key]}`}
    >
      {STATUS_LABELS[key] ?? status}
    </span>
  );
}
