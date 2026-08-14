"use client";

/**
 * Client action for invoking the server-side AI cover-letter pipeline and
 * refreshing the job detail page when a cover letter is persisted. Lets the
 * user pick a tone before generating.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/feedback/ToastProvider";
import {
  COVER_LETTER_TONES,
  COVER_LETTER_TONE_LABELS,
  type CoverLetterTone,
} from "@/lib/types";

interface GenerateCoverLetterResponse {
  id: string;
}

function isGenerateCoverLetterResponse(
  value: unknown
): value is GenerateCoverLetterResponse {
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

export function CoverLetterGenerator({
  applicationId,
}: {
  applicationId: string;
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [tone, setTone] = useState<CoverLetterTone>("professional");
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setIsGenerating(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/cover-letters/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, tone }),
      });
      const body: unknown = await response.json();

      if (!response.ok) {
        const message = readApiError(body) ?? "Unable to generate a cover letter.";
        setError(message);
        notify(message, "error");
        return;
      }
      if (!isGenerateCoverLetterResponse(body)) {
        setError("The server returned an unexpected response.");
        notify("The server returned an unexpected response.", "error");
        return;
      }

      setMessage("Cover letter generated.");
      notify("Cover letter generated.");
      router.refresh();
    } catch {
      setError("Unable to reach the server. Please try again.");
      notify("Unable to reach the server. Please try again.", "error");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <section className="card space-y-4 p-5">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Cover letter
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Draft a tailored cover letter from your active master resume — grounded
          only in facts it already contains.
        </p>
      </div>

      {error && <Feedback tone="error" message={error} />}
      {message && <Feedback tone="success" message={message} />}

      <label className="label block">
        Tone
        <select
          className="input mt-1"
          value={tone}
          onChange={(event) => setTone(event.target.value as CoverLetterTone)}
          disabled={isGenerating}
        >
          {COVER_LETTER_TONES.map((value) => (
            <option key={value} value={value}>
              {COVER_LETTER_TONE_LABELS[value]}
            </option>
          ))}
        </select>
      </label>

      <button
        className="btn-primary w-full"
        type="button"
        onClick={generate}
        disabled={isGenerating}
      >
        {isGenerating ? "Drafting…" : "Generate cover letter"}
      </button>
    </section>
  );
}

function Feedback({
  tone,
  message,
}: {
  tone: "error" | "success";
  message: string;
}) {
  const classes = {
    error: "border-red-200 bg-red-50 text-red-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  }[tone];
  return <div className={`rounded-lg border p-3 text-sm ${classes}`}>{message}</div>;
}
