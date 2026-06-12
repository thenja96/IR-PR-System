import { PageHeader } from "@/components/shared/page-header";
import { AnalysisRunner } from "@/components/ai/analysis-runner";
import { MODULES } from "@/lib/ai/modules";

export default function ScenarioPlannerPage() {
  const m = MODULES.macro_event_scenario;
  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Scenario Planner"
        description="Before a major macro event, pre-plan reactions for above / below / in-line outcomes with confirmation and invalidation signals."
        badge="private only"
        badgeVariant="ai"
      />
      <AnalysisRunner module={m} />
    </div>
  );
}
