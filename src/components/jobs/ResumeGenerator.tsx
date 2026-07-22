"use client";

/**
 * Client action for invoking the server-side AI resume pipeline and refreshing
 * the job detail page when a generated resume is persisted.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";

interface GenerateResumeResponse {
  id: string;
  pdfWarning?: string;
}

function isGenerateResumeResponse(value: unknown): value is GenerateResumeResponse {
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

export function ResumeGenerator({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setIsGenerating(true);
    setMessage(null);
    setWarning(null);
    setError(null);

    try {
      const response = await fetch("/api/resumes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, compilePdf: true }),
      });
      const body: unknown = await response.json();

      if (!response.ok) {
        setError(readApiError(body) ?? "Unable to generate a resume.");
        return;
      }
      if (!isGenerateResumeResponse(body)) {
        setError("The server returned an unexpected response.");
        return;
      }

      setMessage("Tailored resume generated.");
      if (body.pdfWarning) setWarning(body.pdfWarning);
      router.refresh();
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <section className="card space-y-4 p-5">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Tailored resume
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Generate a resume from your active master resume and default LaTeX template.
        </p>
      </div>

      {error && <Feedback tone="error" message={error} />}
      {warning && <Feedback tone="warning" message={warning} />}
      {message && <Feedback tone="success" message={message} />}

      <button className="btn-primary" type="button" onClick={generate} disabled={isGenerating}>
        {isGenerating ? "Generating…" : "Generate tailored resume"}
      </button>
    </section>
  );
}

function Feedback({
  tone,
  message,
}: {
  tone: "error" | "success" | "warning";
  message: string;
}) {
  const classes = {
    error: "border-red-200 bg-red-50 text-red-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
  }[tone];
  return <div className={`rounded-lg border p-3 text-sm ${classes}`}>{message}</div>;
}
