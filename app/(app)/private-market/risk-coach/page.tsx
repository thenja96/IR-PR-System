import { PageHeader } from "@/components/shared/page-header";
import { AnalysisRunner } from "@/components/ai/analysis-runner";
import { MODULES } from "@/lib/ai/modules";

export default function RiskCoachPage() {
  const m = MODULES.risk_discipline_check;
  return (
    <div className="max-w-3xl">
      <PageHeader
        title={m.title}
        description="Run this checklist before every trade. The coach is deliberately blunt about impulsive setups."
        badge="discipline"
        badgeVariant="warning"
      />
      <AnalysisRunner module={m} />
    </div>
  );
}
