"use client";

/**
 * Client controls for application mutations. Status and notes updates are sent
 * through the API so timeline events remain authoritative.
 */
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { APPLICATION_STATUSES, STATUS_LABELS, type ApplicationStatus } from "@/lib/types";

function readApiError(value: unknown): string | null {
  if (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
  ) {
    return value.error;
  }
  return null;
}

export function ApplicationControls({
  applicationId,
  initialStatus,
  initialNotes,
}: {
  applicationId: string;
  initialStatus: ApplicationStatus;
  initialNotes: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<ApplicationStatus>(initialStatus);
  const [notes, setNotes] = useState(initialNotes);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function patchApplication(body: { status?: ApplicationStatus; notes?: string }) {
    const response = await fetch(`/api/applications/${applicationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const responseBody: unknown = await response.json();
    if (!response.ok) {
      throw new Error(readApiError(responseBody) ?? "Unable to update application.");
    }
  }

  async function onStatusChange(nextStatus: ApplicationStatus) {
    setStatus(nextStatus);
    setIsSavingStatus(true);
    setError(null);
    setMessage(null);
    try {
      await patchApplication({ status: nextStatus });
      setMessage("Status updated.");
      router.refresh();
    } catch (err) {
      setStatus(initialStatus);
      setError(err instanceof Error ? err.message : "Unable to update status.");
    } finally {
      setIsSavingStatus(false);
    }
  }

  async function onNotesSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingNotes(true);
    setError(null);
    setMessage(null);
    try {
      await patchApplication({ notes });
      setMessage("Notes saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save notes.");
    } finally {
      setIsSavingNotes(false);
    }
  }

  return (
    <section className="card space-y-4 p-5">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Application controls
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Update status and private notes without leaving this page.
        </p>
      </div>

      {error && <Feedback tone="error" message={error} />}
      {message && <Feedback tone="success" message={message} />}

      <label>
        <span className="label">Status</span>
        <select
          className="input"
          value={status}
          disabled={isSavingStatus}
          onChange={(event) => onStatusChange(event.target.value as ApplicationStatus)}
        >
          {APPLICATION_STATUSES.map((item) => (
            <option key={item} value={item}>
              {STATUS_LABELS[item]}
            </option>
          ))}
        </select>
      </label>

      <form onSubmit={onNotesSubmit} className="space-y-3">
        <label>
          <span className="label">Notes</span>
          <textarea
            className="input"
            rows={5}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>
        <button className="btn-secondary" type="submit" disabled={isSavingNotes}>
          {isSavingNotes ? "Saving…" : "Save notes"}
        </button>
      </form>
    </section>
  );
}

function Feedback({ tone, message }: { tone: "error" | "success"; message: string }) {
  const classes =
    tone === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";
  return <div className={`rounded-lg border p-3 text-sm ${classes}`}>{message}</div>;
}
