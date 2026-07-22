"use client";

/**
 * Client-side add-job form. Writes go through the JSON API so server-side Zod
 * validation and application timeline creation stay centralized.
 */
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/feedback/ToastProvider";
import { mergeJobPostingDraft, parseJobPostingDraft } from "@/lib/jobs/intake";

interface CreatedJobResponse {
  id: string;
}

const FIELD_NAMES = [
  "title",
  "company",
  "location",
  "url",
  "source",
  "salaryRange",
  "description",
  "notes",
] as const;

type FieldName = (typeof FIELD_NAMES)[number];
type FormState = Record<FieldName, string>;

const INITIAL_STATE: FormState = {
  title: "",
  company: "",
  location: "",
  url: "",
  source: "",
  salaryRange: "",
  description: "",
  notes: "",
};

function isCreatedJobResponse(value: unknown): value is CreatedJobResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string"
  );
}

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

export function JobForm() {
  const router = useRouter();
  const { notify } = useToast();
  const [values, setValues] = useState<FormState>(INITIAL_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [parseMessage, setParseMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updateField(name: FieldName, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  function prefillFromPaste() {
    const draft = parseJobPostingDraft(pasteText);
    const populated = FIELD_NAMES.filter((field) => field !== "notes" && Boolean(draft[field]));

    if (populated.length === 0) {
      setParseMessage("Paste a posting with a title, company, URL, salary, or description to prefill the form.");
      notify("No job details found in the pasted text.", "error");
      return;
    }

    setValues((current) => mergeJobPostingDraft(current, draft));
    setParseMessage(`Prefilled ${populated.length} field${populated.length === 1 ? "" : "s"}: ${populated.join(", ")}.`);
    notify("Job details prefilled.");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const body: unknown = await response.json();

      if (!response.ok) {
        const message = readApiError(body) ?? "Unable to save this job posting.";
        setError(message);
        notify(message, "error");
        return;
      }
      if (!isCreatedJobResponse(body)) {
        setError("The server returned an unexpected response.");
        notify("The server returned an unexpected response.", "error");
        return;
      }

      notify("Job saved.");
      router.push(`/jobs/${body.id}`);
      router.refresh();
    } catch {
      setError("Unable to reach the server. Please try again.");
      notify("Unable to reach the server. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-5 p-6">
      <section className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">Paste a job posting</h2>
            <p className="mt-1 text-sm text-slate-500">
              Paste the copied posting text first, then prefill the structured fields before saving.
            </p>
          </div>
          <button
            type="button"
            className="btn-secondary shrink-0"
            onClick={prefillFromPaste}
            disabled={pasteText.trim().length === 0}
          >
            Prefill form
          </button>
        </div>
        <textarea
          className="input mt-3"
          value={pasteText}
          onChange={(event) => {
            setPasteText(event.target.value);
            setParseMessage(null);
          }}
          rows={6}
          placeholder="Paste the full job posting here — title, company, URL, salary, and description will be detected when possible."
        />
        {parseMessage && <p className="mt-2 text-sm text-slate-500">{parseMessage}</p>}
      </section>
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" name="title" value={values.title} onChange={updateField} required />
        <Field label="Company" name="company" value={values.company} onChange={updateField} required />
        <Field label="Location" name="location" value={values.location} onChange={updateField} />
        <Field label="Salary range" name="salaryRange" value={values.salaryRange} onChange={updateField} />
        <Field label="URL" name="url" value={values.url} onChange={updateField} type="url" />
        <Field label="Source" name="source" value={values.source} onChange={updateField} placeholder="LinkedIn, referral, company site…" />
      </div>

      <TextArea label="Description" name="description" value={values.description} onChange={updateField} rows={10} />
      <TextArea label="Notes" name="notes" value={values.notes} onChange={updateField} rows={4} />

      <div className="flex items-center justify-end gap-3">
        <button type="button" className="btn-secondary" onClick={() => router.back()}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save job"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  required = false,
  type = "text",
  placeholder,
}: {
  label: string;
  name: FieldName;
  value: string;
  onChange: (name: FieldName, value: string) => void;
  required?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label>
      <span className="label">{label}</span>
      <input
        className="input"
        name={name}
        type={type}
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        placeholder={placeholder}
        required={required}
      />
    </label>
  );
}

function TextArea({
  label,
  name,
  value,
  onChange,
  rows,
}: {
  label: string;
  name: FieldName;
  value: string;
  onChange: (name: FieldName, value: string) => void;
  rows: number;
}) {
  return (
    <label>
      <span className="label">{label}</span>
      <textarea
        className="input"
        name={name}
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        rows={rows}
      />
    </label>
  );
}
