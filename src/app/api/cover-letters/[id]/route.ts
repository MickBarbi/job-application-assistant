/**
 * /api/cover-letters/[id]
 *   PATCH — save a user-edited cover-letter body
 */
import { ok, parseJson, handle } from "@/lib/api";
import { coverLetterUpdateSchema } from "@/lib/validation";
import { updateCoverLetterBody } from "@/lib/services/cover-letter-service";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const input = await parseJson(request, coverLetterUpdateSchema);
    const record = await updateCoverLetterBody(id, input.body);
    return ok({ id: record.id, body: record.body, edited: record.edited });
  });
}
