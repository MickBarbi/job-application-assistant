/**
 * Pure helpers for building copy-ready application materials and checklists.
 * Keeping the text deterministic makes the job detail sidebar useful even when
 * OpenAI is unavailable or the user is moving quickly through a daily batch.
 */
import { STATUS_LABELS, type ApplicationStatus } from "@/lib/types";

export interface ApplicationKitInput {
  title: string;
  company: string;
  location: string;
  url: string;
  status: ApplicationStatus;
  hasGeneratedResume: boolean;
}

export interface ChecklistItem {
  label: string;
  done: boolean;
}

export interface CopySnippet {
  label: string;
  text: string;
}

export function buildApplicationChecklist(input: ApplicationKitInput): ChecklistItem[] {
  const hasApplied = input.status !== "saved";

  return [
    { label: "Posting saved in tracker", done: true },
    { label: "Posting link captured", done: input.url.length > 0 },
    { label: "Tailored resume generated", done: input.hasGeneratedResume },
    { label: "Application submitted", done: hasApplied },
    { label: "Follow-up notes saved", done: ["interview", "offer", "accepted"].includes(input.status) },
  ];
}

export function buildCopySnippets(input: ApplicationKitInput): CopySnippet[] {
  return [
    {
      label: "Recruiter/referral note",
      text: buildRecruiterMessage(input),
    },
    {
      label: "Post-apply follow-up",
      text: buildFollowUpMessage(input),
    },
    {
      label: "Tracking summary",
      text: buildTrackingSummary(input),
    },
  ];
}

function buildRecruiterMessage(input: ApplicationKitInput): string {
  const location = input.location ? ` (${input.location})` : "";
  const posting = input.url ? `\nPosting: ${input.url}` : "";

  return [
    "Hi —",
    "",
    `I’m applying for the ${input.title} role at ${input.company}${location} and wanted to reach out directly.`,
    "My background lines up well with the role, and I’d appreciate any guidance on the best way to be considered.",
    posting.trimEnd(),
    "",
    "Thanks!",
  ]
    .filter((line) => line.length > 0 || line === "")
    .join("\n")
    .trim();
}

function buildFollowUpMessage(input: ApplicationKitInput): string {
  const posting = input.url ? ` I applied through the posting here: ${input.url}` : "";

  return [
    "Hi —",
    "",
    `I wanted to follow up on my application for the ${input.title} role at ${input.company}.${posting}`,
    "I’m very interested in the opportunity and would be happy to share any additional context that would be useful.",
    "",
    "Thanks again for your time.",
  ].join("\n");
}

function buildTrackingSummary(input: ApplicationKitInput): string {
  const lines = [
    `${input.title} — ${input.company}`,
    input.location ? `Location: ${input.location}` : "",
    `Status: ${STATUS_LABELS[input.status]}`,
    input.hasGeneratedResume ? "Resume: tailored resume generated" : "Resume: not generated yet",
    input.url ? `Posting: ${input.url}` : "Posting: link not captured",
  ];

  return lines.filter(Boolean).join("\n");
}
