import { prisma } from "@/lib/db";
import { SAMPLE_MASTER_RESUME } from "@/lib/resume/defaults";
import { masterResumeDataSchema } from "@/lib/validation";
import { MasterResumeEditor } from "@/components/settings/MasterResumeEditor";
import { TemplateManager, type TemplateSummary } from "@/components/settings/TemplateManager";

export const dynamic = "force-dynamic";

async function getSettingsData() {
  const [resume, templates] = await Promise.all([
    prisma.masterResume.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.latexTemplate.findMany({
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    }),
  ]);

  const masterResume = resume
    ? {
        label: resume.label,
        data: masterResumeDataSchema.parse(JSON.parse(resume.data)),
      }
    : { label: "Default", data: SAMPLE_MASTER_RESUME };

  const templateSummaries: TemplateSummary[] = templates.map((template) => ({
    id: template.id,
    name: template.name,
    description: template.description,
    body: template.body,
    isDefault: template.isDefault,
  }));

  return { masterResume, templates: templateSummaries };
}

export default async function SettingsPage() {
  const { masterResume, templates } = await getSettingsData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-slate-500">
          Manage the factual resume source and LaTeX templates used for tailoring.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.85fr)]">
        <MasterResumeEditor
          initialLabel={masterResume.label}
          initialData={masterResume.data}
        />
        <TemplateManager templates={templates} />
      </div>
    </div>
  );
}
