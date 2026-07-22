"use client";

/**
 * Client-side LaTeX template manager. Template writes go through the JSON API so
 * default-template invariants stay enforced by the route handlers.
 */
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export interface TemplateSummary {
  id: string;
  name: string;
  description: string;
  body: string;
  isDefault: boolean;
}

interface TemplateDraft {
  name: string;
  description: string;
  body: string;
  isDefault: boolean;
}

const EMPTY_TEMPLATE: TemplateDraft = {
  name: "",
  description: "",
  body: "",
  isDefault: false,
};

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

export function TemplateManager({ templates }: { templates: TemplateSummary[] }) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, TemplateDraft>>(() =>
    Object.fromEntries(
      templates.map((template) => [
        template.id,
        {
          name: template.name,
          description: template.description,
          body: template.body,
          isDefault: template.isDefault,
        },
      ])
    )
  );
  const [newTemplate, setNewTemplate] = useState<TemplateDraft>(EMPTY_TEMPLATE);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updateDraft(id: string, patch: Partial<TemplateDraft>) {
    setDrafts((current) => {
      const existing = current[id];
      if (!existing) return current;
      return { ...current, [id]: { ...existing, ...patch } };
    });
  }

  async function saveTemplate(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const draft = drafts[id];
    if (!draft) return;
    setBusyId(id);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(`/api/templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        setError(readApiError(body) ?? "Unable to save this template.");
        return;
      }
      setMessage("Template saved.");
      router.refresh();
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteTemplate(id: string) {
    setBusyId(id);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(`/api/templates/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const body: unknown = await response.json();
        setError(readApiError(body) ?? "Unable to delete this template.");
        return;
      }
      setMessage("Template deleted.");
      router.refresh();
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function createTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyId("new");
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTemplate),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        setError(readApiError(body) ?? "Unable to create this template.");
        return;
      }
      setNewTemplate(EMPTY_TEMPLATE);
      setMessage("Template created.");
      router.refresh();
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="space-y-5">
      <div className="card p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          LaTeX templates
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          The default template is used when generating resumes unless another is selected.
        </p>
        {error && <div className="mt-4"><Feedback tone="error" message={error} /></div>}
        {message && <div className="mt-4"><Feedback tone="success" message={message} /></div>}
      </div>

      {templates.map((template) => {
        const draft = drafts[template.id];
        if (!draft) return null;
        return (
          <form
            key={template.id}
            onSubmit={(event) => saveTemplate(event, template.id)}
            className="card space-y-4 p-5"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="font-semibold">{template.name}</h3>
                <p className="text-xs text-slate-500">
                  {template.isDefault ? "Default template" : "Template"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="btn-secondary" type="submit" disabled={busyId === template.id}>
                  {busyId === template.id ? "Saving…" : "Save"}
                </button>
                <button
                  className="btn-danger"
                  type="button"
                  disabled={busyId === template.id || templates.length <= 1}
                  onClick={() => deleteTemplate(template.id)}
                >
                  Delete
                </button>
              </div>
            </div>

            <TemplateFields
              value={draft}
              onChange={(patch) => updateDraft(template.id, patch)}
            />
          </form>
        );
      })}

      <form onSubmit={createTemplate} className="card space-y-4 p-5">
        <div>
          <h3 className="font-semibold">Add template</h3>
          <p className="text-sm text-slate-500">
            Paste a LaTeX template that uses the supported resume placeholders.
          </p>
        </div>
        <TemplateFields value={newTemplate} onChange={(patch) => setNewTemplate((current) => ({ ...current, ...patch }))} />
        <button className="btn-primary" type="submit" disabled={busyId === "new"}>
          {busyId === "new" ? "Creating…" : "Create template"}
        </button>
      </form>
    </section>
  );
}

function TemplateFields({
  value,
  onChange,
}: {
  value: TemplateDraft;
  onChange: (patch: Partial<TemplateDraft>) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className="label">Name</span>
          <input
            className="input"
            value={value.name}
            onChange={(event) => onChange({ name: event.target.value })}
            required
          />
        </label>
        <label>
          <span className="label">Description</span>
          <input
            className="input"
            value={value.description}
            onChange={(event) => onChange({ description: event.target.value })}
          />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={value.isDefault}
          onChange={(event) => onChange({ isDefault: event.target.checked })}
        />
        Use as default template
      </label>
      <label>
        <span className="label">Template body</span>
        <textarea
          className="input font-mono text-xs leading-5"
          rows={16}
          value={value.body}
          onChange={(event) => onChange({ body: event.target.value })}
          spellCheck={false}
          required
        />
      </label>
    </div>
  );
}

function Feedback({ tone, message }: { tone: "error" | "success"; message: string }) {
  const classes =
    tone === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";
  return <div className={`rounded-lg border p-3 text-sm ${classes}`}>{message}</div>;
}
