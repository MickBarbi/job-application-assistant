/**
 * Application service — status transitions and timeline events.
 *
 * All application mutations flow through here so that every status change is
 * recorded as an `ApplicationEvent`, keeping the timeline authoritative.
 */
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/api";
import {
  STATUS_LABELS,
  type ApplicationStatus,
} from "@/lib/types";
import type { ApplicationUpdateInput } from "@/lib/validation";

/** Fetches an application with its posting, events, and generated resumes. */
export async function getApplicationDetail(id: string) {
  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      jobPosting: true,
      events: { orderBy: { createdAt: "desc" } },
      generatedResumes: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          rationale: true,
          model: true,
          pdfPath: true,
          createdAt: true,
        },
      },
    },
  });
  if (!application) {
    throw new HttpError(404, "Application not found.");
  }
  return application;
}

/**
 * Applies an update to an application. Records a `status_changed` event when the
 * status actually changes, and sets `appliedAt` the first time it becomes
 * "applied".
 */
export async function updateApplication(
  id: string,
  input: ApplicationUpdateInput
) {
  const existing = await prisma.application.findUnique({ where: { id } });
  if (!existing) {
    throw new HttpError(404, "Application not found.");
  }

  const statusChanged =
    input.status !== undefined && input.status !== existing.status;
  const becomingApplied =
    input.status === "applied" && existing.appliedAt === null;

  const [updated] = await prisma.$transaction([
    prisma.application.update({
      where: { id },
      data: {
        status: input.status ?? existing.status,
        notes: input.notes ?? existing.notes,
        nextActionAt:
          input.nextActionAt === undefined
            ? existing.nextActionAt
            : input.nextActionAt
              ? new Date(input.nextActionAt)
              : null,
        appliedAt: becomingApplied ? new Date() : existing.appliedAt,
      },
    }),
    ...(statusChanged
      ? [
          prisma.applicationEvent.create({
            data: {
              applicationId: id,
              type: "status_changed",
              message: `Status changed from ${
                STATUS_LABELS[existing.status as ApplicationStatus] ??
                existing.status
              } to ${STATUS_LABELS[input.status as ApplicationStatus]}.`,
            },
          }),
        ]
      : []),
  ]);

  return updated;
}

/** Records a free-form note event on an application's timeline. */
export async function addNoteEvent(id: string, message: string) {
  return prisma.applicationEvent.create({
    data: { applicationId: id, type: "note", message },
  });
}
