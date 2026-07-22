"use client";

/**
 * Settings editor for the active master resume. The structured resume remains
 * JSON so the server can validate it with the canonical Zod schema on save.
 */
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { MasterResumeData } from "@/lib/validation";

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

export function MasterResumeEditor({
  initialLabel,
  initialData,
}: {
  initialLabel: string;
  initialData: MasterResumeData;
}) {
  const router = useRouter();
  const [label, setLabel] = useState(initialLabel);
  const [json, setJson] = useState(() => JSON.stringify(initialData, null, 2));
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    setError(null);

    let data: unknown;
    try {
      data = JSON.parse(json);
    } catch {
      setIsSaving(false);
      setError("Master resume must be valid JSON.");
      return;
    }

    try {
      const response = await fetch("/api/master-resume", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, data }),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        setError(readApiError(body) ?? "Unable to save the master resume.");
        return;
      }
      setMessage("Master resume saved.");
      router.refresh();
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="card p-5">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Active master resume
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          This JSON is the canonical fact source the AI may tailor from.
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        {error && <Feedback tone="error" message={error} />}
        {message && <Feedback tone="success" message={message} />}

        <label>
          <span className="label">Label</span>
          <input
            className="input"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            required
          />
        </label>

        <label>
          <span className="label">Resume JSON</span>
          <textarea
            className="input font-mono text-xs leading-5"
            rows={28}
            value={json}
            onChange={(event) => setJson(event.target.value)}
            spellCheck={false}
          />
        </label>

        <button className="btn-primary" type="submit" disabled={isSaving}>
          {isSaving ? "Saving…" : "Save master resume"}
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
