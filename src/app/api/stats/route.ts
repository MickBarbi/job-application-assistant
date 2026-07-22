/**
 * /api/stats — pipeline summary for the dashboard.
 */
import { prisma } from "@/lib/db";
import { ok, handle } from "@/lib/api";
import { APPLICATION_STATUSES, ACTIVE_STATUSES } from "@/lib/types";

export async function GET() {
  return handle(async () => {
    const grouped = await prisma.application.groupBy({
      by: ["status"],
      _count: { _all: true },
    });

    const byStatus = Object.fromEntries(
      APPLICATION_STATUSES.map((s) => [s, 0])
    ) as Record<string, number>;
    for (const row of grouped) {
      byStatus[row.status] = row._count._all;
    }

    const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
    const active = ACTIVE_STATUSES.reduce((a, s) => a + (byStatus[s] ?? 0), 0);
    const resumesGenerated = await prisma.generatedResume.count();

    return ok({ total, active, byStatus, resumesGenerated });
  });
}
