"use client";

/**
 * A single generated cover letter with an inline editor. Users can tweak the
 * AI draft and save it; the saved body flows through to copy and `.txt`
 * download. View/edit is a local toggle, and a successful save refreshes the
 * page so the timeline and "edited" state stay in sync.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/feedback/ToastProvider";
import { CopyButton } from "@/components/CopyButton";
import {
  COVER_LETTER_TONE_LABELS,
  isCoverLetterTone,
} from "@/lib/types";

interface CoverLetterCardProps {
  id: string;
  body: string;
  rationale: string;
  tone: string;
  model: string;
  createdLabel: string;
  edited: boolean;
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

export function CoverLetterCard(props: CoverLetterCardProps) {
  const router = useRouter();
  const { notify } = useToast();
  const [body, setBody] = useState(props.body);
  const [edited, setEdited] = useState(props.edited);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(props.body);
  const [isSaving, setIsSaving] = useState(false);

  const toneLabel = isCoverLetterTone(props.tone)
    ? COVER_LETTER_TONE_LABELS[props.tone]
    : props.tone;

  function startEditing() {
    setDraft(body);
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
    setDraft(body);
  }

  async function save() {
    const trimmed = draft.trim();
    if (!trimmed) {
      notify("Cover letter cannot be empty.", "error");
      return;
    }
    if (trimmed === body) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/cover-letters/${props.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: trimmed }),
      });
      const payload: unknown = await response.json();

      if (!response.ok) {
        const message = readApiError(payload) ?? "Unable to save changes.";
        notify(message, "error");
        return;
      }

      setBody(trimmed);
      setEdited(true);
      setIsEditing(false);
      notify("Cover letter saved.");
      router.refresh();
    } catch {
      notify("Unable to reach the server. Please try again.", "error");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <li className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
            {toneLabel}
          </span>
          <p className="text-sm font-medium">{props.createdLabel}</p>
          <p className="text-xs text-slate-500">· {props.model}</p>
          {edited && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              Edited
            </span>
          )}
        </div>
        {!isEditing && (
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary text-xs" onClick={startEditing}>
              Edit
            </button>
            <CopyButton value={body} label="Copy text" className="btn-secondary text-xs" />
            <a className="btn-secondary text-xs" href={`/api/cover-letters/${props.id}/txt`}>
              .txt
            </a>
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="mt-3 space-y-3">
          <textarea
            className="input min-h-[16rem] w-full font-sans leading-6"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            disabled={isSaving}
            aria-label="Cover letter body"
          />
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary text-xs" onClick={save} disabled={isSaving}>
              {isSaving ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              className="btn-secondary text-xs"
              onClick={cancelEditing}
              disabled={isSaving}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap border-l-2 border-slate-300 bg-white p-3 font-sans text-sm leading-6 text-slate-700">
          {body}
        </pre>
      )}

      {props.rationale && !isEditing && (
        <p className="mt-2 text-xs italic text-slate-500">{props.rationale}</p>
      )}
    </li>
  );
}
