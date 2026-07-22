/**
 * /api/applications/[id]
 *   GET   — fetch an application with posting, timeline, and generated resumes
 *   PATCH — update status / notes / next action (records timeline events)
 */
import { ok, parseJson, handle } from "@/lib/api";
import { applicationUpdateSchema } from "@/lib/validation";
import {
  getApplicationDetail,
  updateApplication,
} from "@/lib/services/applications";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    return ok(await getApplicationDetail(id));
  });
}

export async function PATCH(request: Request, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const input = await parseJson(request, applicationUpdateSchema);
    return ok(await updateApplication(id, input));
  });
}
