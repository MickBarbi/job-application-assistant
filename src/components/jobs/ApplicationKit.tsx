"use client";

/**
 * Copy-ready application helper shown on job detail pages. It gives the user a
 * fast per-job checklist and outreach snippets without adding another AI call.
 */
import { useState } from "react";
import { useToast } from "@/components/feedback/ToastProvider";
import {
  buildApplicationChecklist,
  buildCopySnippets,
  type ApplicationKitInput,
} from "@/lib/jobs/application-kit";

export function ApplicationKit({ input }: { input: ApplicationKitInput }) {
  const { notify } = useToast();
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);
  const checklist = buildApplicationChecklist(input);
  const snippets = buildCopySnippets(input);
  const completed = checklist.filter((item) => item.done).length;

  async function copySnippet(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLabel(label);
      notify(`${label} copied.`);
    } catch {
      notify("Clipboard access was blocked. Select and copy the text manually.", "error");
    }
  }

  return (
    <section className="card overflow-hidden">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-5 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
          Application kit
        </p>
        <h2 className="mt-2 text-lg font-semibold">Move this application faster</h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Use the checklist and copy-ready messages to submit, follow up, and keep momentum.
        </p>
        <p className="mt-4 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-white">
          {completed}/{checklist.length} steps ready
        </p>
      </div>

      <div className="space-y-5 p-5">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Apply checklist
          </h3>
          <ul className="mt-3 space-y-2">
            {checklist.map((item) => (
              <li key={item.label} className="flex items-center gap-2 text-sm text-slate-700">
                <span
                  className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold ${
                    item.done ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
                  }`}
                  aria-hidden="true"
                >
                  {item.done ? "✓" : ""}
                </span>
                {item.label}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Copy snippets
          </h3>
          {snippets.map((snippet) => (
            <div key={snippet.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-800">{snippet.label}</p>
                <button
                  type="button"
                  className="btn-secondary px-2.5 py-1.5 text-xs"
                  onClick={() => copySnippet(snippet.label, snippet.text)}
                >
                  {copiedLabel === snippet.label ? "Copied" : "Copy"}
                </button>
              </div>
              <pre className="mt-3 max-h-36 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-3 text-xs leading-5 text-slate-600">
                {snippet.text}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
