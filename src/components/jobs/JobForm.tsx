"use client";

/**
 * Client-side add-job form. Writes go through the JSON API so server-side Zod
 * validation and application timeline creation stay centralized.
 */
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

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
  const [values, setValues] = useState<FormState>(INITIAL_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField(name: FieldName, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
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
        setError(readApiError(body) ?? "Unable to save this job posting.");
        return;
      }
      if (!isCreatedJobResponse(body)) {
        setError("The server returned an unexpected response.");
        return;
      }

      router.push(`/jobs/${body.id}`);
      router.refresh();
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-5 p-6">
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
