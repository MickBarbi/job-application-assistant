/**
 * Shared domain types and constants.
 *
 * Runtime validation for these shapes lives in `./validation.ts` (zod). Types
 * here are inferred from those schemas where possible to keep a single source
 * of truth.
 */

/** The ordered lifecycle stages an application moves through. */
export const APPLICATION_STATUSES = [
  "saved",
  "applied",
  "interview",
  "offer",
  "accepted",
  "rejected",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/** Human-friendly labels for each status. */
export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  saved: "Saved",
  applied: "Applied",
  interview: "Interviewing",
  offer: "Offer",
  accepted: "Accepted",
  rejected: "Rejected",
};

/** Statuses that represent an active (non-terminal) application. */
export const ACTIVE_STATUSES: ApplicationStatus[] = [
  "saved",
  "applied",
  "interview",
  "offer",
];

/** Terminal statuses. */
export const TERMINAL_STATUSES: ApplicationStatus[] = ["accepted", "rejected"];

export function isApplicationStatus(value: unknown): value is ApplicationStatus {
  return (
    typeof value === "string" &&
    (APPLICATION_STATUSES as readonly string[]).includes(value)
  );
}

/** Types of events recorded on an application timeline. */
export const APPLICATION_EVENT_TYPES = [
  "created",
  "status_changed",
  "resume_generated",
  "cover_letter_generated",
  "note",
] as const;

export type ApplicationEventType = (typeof APPLICATION_EVENT_TYPES)[number];

/** Tones the cover-letter generator can aim for. */
export const COVER_LETTER_TONES = [
  "professional",
  "enthusiastic",
  "concise",
] as const;

export type CoverLetterTone = (typeof COVER_LETTER_TONES)[number];

/** Human-friendly labels and guidance for each cover-letter tone. */
export const COVER_LETTER_TONE_LABELS: Record<CoverLetterTone, string> = {
  professional: "Professional",
  enthusiastic: "Enthusiastic",
  concise: "Concise",
};

export function isCoverLetterTone(value: unknown): value is CoverLetterTone {
  return (
    typeof value === "string" &&
    (COVER_LETTER_TONES as readonly string[]).includes(value)
  );
}
