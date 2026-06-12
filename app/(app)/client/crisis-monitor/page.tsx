import { PageHeader } from "@/components/shared/page-header";
import { AnalysisRunner } from "@/components/ai/analysis-runner";
import { MODULES } from "@/lib/ai/modules";

export default function CrisisMonitorPage() {
  const m = MODULES.crisis_monitor;
  return (
    <div className="max-w-4xl">
      <PageHeader
        title={m.title}
        description={m.description}
        badge="risk"
        badgeVariant="danger"
      />
      <AnalysisRunner module={m} />
    </div>
  );
}
