import { PageHeader } from "@/components/shared/page-header";
import { AnalysisRunner } from "@/components/ai/analysis-runner";
import { MODULES } from "@/lib/ai/modules";

export default function AnnouncementRadarPage() {
  const m = MODULES.bursa_announcement;
  return (
    <div className="max-w-4xl">
      <PageHeader title={m.title} description={m.description} badge="AI module" badgeVariant="ai" />
      <AnalysisRunner module={m} />
    </div>
  );
}
