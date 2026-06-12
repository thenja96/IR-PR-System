import { PageHeader } from "@/components/shared/page-header";
import { AnalysisRunner } from "@/components/ai/analysis-runner";
import { MODULES } from "@/lib/ai/modules";

export default function MonthlyValueReportPage() {
  const m = MODULES.client_monthly_value_report;
  return (
    <div className="max-w-4xl">
      <PageHeader title={m.title} description={m.description} badge="AI module" badgeVariant="ai" />
      <AnalysisRunner module={m} />
    </div>
  );
}
