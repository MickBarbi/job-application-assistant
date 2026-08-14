/**
 * /api/cover-letters/[id]/txt — download the generated cover letter as text.
 */
import { handle } from "@/lib/api";
import { getGeneratedCoverLetter } from "@/lib/services/cover-letter-service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const record = await getGeneratedCoverLetter(id);
    return new Response(record.body, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="cover-letter-${id}.txt"`,
      },
    });
  });
}
