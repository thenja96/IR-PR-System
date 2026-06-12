import { PageHeader } from "@/components/shared/page-header";
import { AnalysisRunner } from "@/components/ai/analysis-runner";
import { MODULES } from "@/lib/ai/modules";

export default function ClientReportBuilderPage() {
  const m = MODULES.report_builder_client;
  return (
    <div className="max-w-4xl">
      <PageHeader
        title={m.title}
        description="Generate client-ready Markdown deliverables — copy to clipboard when done. PDF/DOCX export is a later phase."
        badge="deliverables"
        badgeVariant="success"
      />
      <AnalysisRunner module={m} />
    </div>
  );
}
