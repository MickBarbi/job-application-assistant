/**
 * /api/resumes/[id]/tex — download the generated LaTeX source.
 */
import { handle } from "@/lib/api";
import { getGeneratedResume } from "@/lib/services/resume-service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const record = await getGeneratedResume(id);
    return new Response(record.latexSource, {
      headers: {
        "Content-Type": "application/x-tex; charset=utf-8",
        "Content-Disposition": `attachment; filename="resume-${id}.tex"`,
      },
    });
  });
}
