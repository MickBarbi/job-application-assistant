import Link from "next/link";
import { JobForm } from "@/components/jobs/JobForm";

export default function NewJobPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/jobs" className="text-sm text-slate-500 hover:underline">
          ← Back to jobs
        </Link>
        <h1 className="mt-3 text-2xl font-bold">Add job</h1>
        <p className="text-sm text-slate-500">
          Save a posting and start its application timeline.
        </p>
      </div>
      <JobForm />
    </div>
  );
}
