/**
 * /api/resumes/[id]/pdf — download the compiled PDF for a generated resume.
 *
 * Returns 404 if the resume has no compiled PDF (e.g. no LaTeX engine was
 * available at generation time). The client can offer the .tex instead.
 */
import { handle, HttpError, error } from "@/lib/api";
import { getGeneratedResume } from "@/lib/services/resume-service";
import { readStoredPdf } from "@/lib/resume/pdf";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const record = await getGeneratedResume(id);
    if (!record.pdfPath) {
      throw new HttpError(404, "No compiled PDF for this resume. Download the .tex instead.");
    }
    try {
      const buffer = await readStoredPdf(record.pdfPath);
      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="resume-${id}.pdf"`,
        },
      });
    } catch {
      return error("PDF file is missing from storage.", 410);
    }
  });
}
