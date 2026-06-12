import { PageHeader } from "@/components/shared/page-header";
import { AnalysisRunner } from "@/components/ai/analysis-runner";
import { MODULES } from "@/lib/ai/modules";

export default function PrivateReportBuilderPage() {
  const m = MODULES.report_builder_private;
  return (
    <div className="max-w-4xl">
      <PageHeader
        title={m.title}
        description="Daily notes, weekly reviews, scenario notes, journal reviews, and discipline summaries — Markdown output with copy to clipboard."
        badge="private only"
        badgeVariant="ai"
      />
      <AnalysisRunner module={m} />
    </div>
  );
}
