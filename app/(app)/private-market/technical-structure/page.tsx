import { PageHeader } from "@/components/shared/page-header";
import { AnalysisRunner } from "@/components/ai/analysis-runner";
import { MODULES } from "@/lib/ai/modules";

export default function TechnicalStructurePage() {
  const m = MODULES.gold_technical_structure;
  return (
    <div className="max-w-4xl">
      <PageHeader
        title={m.title}
        description={m.description}
        badge="private only"
        badgeVariant="ai"
      />
      <AnalysisRunner module={m} />
    </div>
  );
}
