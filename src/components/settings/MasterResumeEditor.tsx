"use client";

/**
 * Structured Settings editor for the active master resume. The form edits the
 * same MasterResumeData shape that the API validates with Zod, avoiding a
 * separate UI-only model while making day-to-day resume edits safer than raw JSON.
 */
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/feedback/ToastProvider";
import {
  appendItem,
  emptyEducation,
  emptyExperience,
  emptyProject,
  listToMultiline,
  multilineToList,
  removeAt,
  replaceAt,
} from "@/lib/resume/editor-state";
import type {
  MasterResumeData,
  ResumeContact,
  ResumeEducation,
  ResumeExperience,
  ResumeProject,
} from "@/lib/validation";

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
  const { notify } = useToast();
  const [label, setLabel] = useState(initialLabel);
  const [data, setData] = useState<MasterResumeData>(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/master-resume", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, data }),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        const nextMessage = readApiError(body) ?? "Unable to save the master resume.";
        setError(nextMessage);
        notify(nextMessage, "error");
        return;
      }
      setMessage("Master resume saved.");
      notify("Master resume saved.");
      router.refresh();
    } catch {
      setError("Unable to reach the server. Please try again.");
      notify("Unable to reach the server. Please try again.", "error");
    } finally {
      setIsSaving(false);
    }
  }

  function updateContact(patch: Partial<ResumeContact>) {
    setData((current) => ({
      ...current,
      contact: { ...current.contact, ...patch },
    }));
  }

  function updateExperience(index: number, patch: Partial<ResumeExperience>) {
    setData((current) => {
      const existing = current.experience[index];
      if (!existing) return current;
      return {
        ...current,
        experience: replaceAt(current.experience, index, { ...existing, ...patch }),
      };
    });
  }

  function updateEducation(index: number, patch: Partial<ResumeEducation>) {
    setData((current) => {
      const existing = current.education[index];
      if (!existing) return current;
      return {
        ...current,
        education: replaceAt(current.education, index, { ...existing, ...patch }),
      };
    });
  }

  function updateProject(index: number, patch: Partial<ResumeProject>) {
    setData((current) => {
      const existing = current.projects[index];
      if (!existing) return current;
      return {
        ...current,
        projects: replaceAt(current.projects, index, { ...existing, ...patch }),
      };
    });
  }

  return (
    <section className="card p-5">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Active master resume
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          The AI may only tailor facts present in these structured sections.
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-5 space-y-6">
        {error && <Feedback tone="error" message={error} />}
        {message && <Feedback tone="success" message={message} />}

        <Section title="Resume label">
          <TextField label="Label" value={label} onChange={setLabel} required />
        </Section>

        <Section title="Contact">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Name" value={data.contact.name} onChange={(value) => updateContact({ name: value })} required />
            <TextField label="Email" type="email" value={data.contact.email} onChange={(value) => updateContact({ email: value })} />
            <TextField label="Phone" value={data.contact.phone} onChange={(value) => updateContact({ phone: value })} />
            <TextField label="Location" value={data.contact.location} onChange={(value) => updateContact({ location: value })} />
            <TextField label="Website" value={data.contact.website} onChange={(value) => updateContact({ website: value })} />
            <TextField label="LinkedIn" value={data.contact.linkedin} onChange={(value) => updateContact({ linkedin: value })} />
            <TextField label="GitHub" value={data.contact.github} onChange={(value) => updateContact({ github: value })} />
          </div>
        </Section>

        <Section title="Summary">
          <TextArea label="Summary" value={data.summary} rows={4} onChange={(summary) => setData((current) => ({ ...current, summary }))} />
        </Section>

        <Section title="Skills">
          <TextArea
            label="One skill per line"
            value={listToMultiline(data.skills)}
            rows={6}
            onChange={(value) => setData((current) => ({ ...current, skills: multilineToList(value) }))}
          />
        </Section>

        <Section
          title="Experience"
          action={<AddButton label="Add experience" onClick={() => setData((current) => ({ ...current, experience: appendItem(current.experience, emptyExperience()) }))} />}
        >
          <div className="space-y-4">
            {data.experience.length === 0 ? <Empty message="No experience entries yet." /> : null}
            {data.experience.map((experience, index) => (
              <div key={index} className="rounded-lg border border-slate-200 p-4">
                <EntryHeader title={experience.company || `Experience ${index + 1}`} onRemove={() => setData((current) => ({ ...current, experience: removeAt(current.experience, index) }))} />
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <TextField label="Company" value={experience.company} onChange={(value) => updateExperience(index, { company: value })} required />
                  <TextField label="Title" value={experience.title} onChange={(value) => updateExperience(index, { title: value })} required />
                  <TextField label="Location" value={experience.location} onChange={(value) => updateExperience(index, { location: value })} />
                  <TextField label="Start date" value={experience.startDate} onChange={(value) => updateExperience(index, { startDate: value })} />
                  <TextField label="End date" value={experience.endDate} onChange={(value) => updateExperience(index, { endDate: value })} />
                </div>
                <TextArea
                  label="Highlights — one per line"
                  value={listToMultiline(experience.highlights)}
                  rows={5}
                  onChange={(value) => updateExperience(index, { highlights: multilineToList(value) })}
                />
              </div>
            ))}
          </div>
        </Section>

        <Section
          title="Education"
          action={<AddButton label="Add education" onClick={() => setData((current) => ({ ...current, education: appendItem(current.education, emptyEducation()) }))} />}
        >
          <div className="space-y-4">
            {data.education.length === 0 ? <Empty message="No education entries yet." /> : null}
            {data.education.map((education, index) => (
              <div key={index} className="rounded-lg border border-slate-200 p-4">
                <EntryHeader title={education.institution || `Education ${index + 1}`} onRemove={() => setData((current) => ({ ...current, education: removeAt(current.education, index) }))} />
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <TextField label="Institution" value={education.institution} onChange={(value) => updateEducation(index, { institution: value })} required />
                  <TextField label="Degree" value={education.degree} onChange={(value) => updateEducation(index, { degree: value })} />
                  <TextField label="Field" value={education.field} onChange={(value) => updateEducation(index, { field: value })} />
                  <TextField label="Start date" value={education.startDate} onChange={(value) => updateEducation(index, { startDate: value })} />
                  <TextField label="End date" value={education.endDate} onChange={(value) => updateEducation(index, { endDate: value })} />
                </div>
                <TextArea label="Details" value={education.details} rows={3} onChange={(value) => updateEducation(index, { details: value })} />
              </div>
            ))}
          </div>
        </Section>

        <Section
          title="Projects"
          action={<AddButton label="Add project" onClick={() => setData((current) => ({ ...current, projects: appendItem(current.projects, emptyProject()) }))} />}
        >
          <div className="space-y-4">
            {data.projects.length === 0 ? <Empty message="No project entries yet." /> : null}
            {data.projects.map((project, index) => (
              <div key={index} className="rounded-lg border border-slate-200 p-4">
                <EntryHeader title={project.name || `Project ${index + 1}`} onRemove={() => setData((current) => ({ ...current, projects: removeAt(current.projects, index) }))} />
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <TextField label="Name" value={project.name} onChange={(value) => updateProject(index, { name: value })} required />
                  <TextField label="URL" value={project.url} onChange={(value) => updateProject(index, { url: value })} />
                </div>
                <TextArea label="Description" value={project.description} rows={3} onChange={(value) => updateProject(index, { description: value })} />
                <TextArea
                  label="Highlights — one per line"
                  value={listToMultiline(project.highlights)}
                  rows={4}
                  onChange={(value) => updateProject(index, { highlights: multilineToList(value) })}
                />
              </div>
            ))}
          </div>
        </Section>

        <details className="rounded-lg border border-slate-200 p-4">
          <summary className="cursor-pointer text-sm font-medium text-slate-700">
            Preview JSON payload
          </summary>
          <pre className="mt-3 max-h-80 overflow-auto rounded bg-slate-950 p-3 text-xs text-slate-100">
            {JSON.stringify(data, null, 2)}
          </pre>
        </details>

        <button className="btn-primary" type="submit" disabled={isSaving}>
          {isSaving ? "Saving…" : "Save master resume"}
        </button>
      </form>
    </section>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="space-y-4 border-t border-slate-100 pt-5">
      <div className="flex items-center justify-between gap-3">
        <legend className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </legend>
        {action}
      </div>
      {children}
    </fieldset>
  );
}

function TextField({
  label,
  value,
  onChange,
  required = false,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <label>
      <span className="label">{label}</span>
      <input
        className="input"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows: number;
}) {
  return (
    <label className="mt-4 block">
      <span className="label">{label}</span>
      <textarea
        className="input"
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="btn-secondary" onClick={onClick}>
      {label}
    </button>
  );
}

function EntryHeader({ title, onRemove }: { title: string; onRemove: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h4 className="font-medium">{title}</h4>
      <button type="button" className="btn-danger" onClick={onRemove}>
        Remove
      </button>
    </div>
  );
}

function Empty({ message }: { message: string }) {
  return <p className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">{message}</p>;
}

function Feedback({ tone, message }: { tone: "error" | "success"; message: string }) {
  const classes =
    tone === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";
  return <div className={`rounded-lg border p-3 text-sm ${classes}`}>{message}</div>;
}
